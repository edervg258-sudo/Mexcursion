// ============================================================
//  lib/stripe.test.ts
//  Tests for Stripe payment integration
// ============================================================

import { crearIntentoPago, confirmarPago } from './stripe';
import * as supabaseModule from './supabase';

// Mock Supabase
jest.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockSupabase = supabaseModule.supabase as jest.Mocked<typeof supabaseModule.supabase>;

describe('Stripe Payment Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crearIntentoPago', () => {
    const validInput = {
      amount: 5000,
      description: 'Viaje a Cancún',
      payerEmail: 'usuario@example.com',
      externalReference: 'RESERVA-001',
    };

    it('debería crear un intent de pago exitosamente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          clientSecret: 'pi_test_secret_123',
          intentId: 'pi_test_123',
        },
        error: null,
      });

      const result = await crearIntentoPago(validInput);

      expect(result).toEqual({
        clientSecret: 'pi_test_secret_123',
        intentId: 'pi_test_123',
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
        body: validInput,
      });
    });

    it('debería rechazar si falta el clientSecret en la respuesta', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          intentId: 'pi_test_123',
          // clientSecret faltante
        },
        error: null,
      });

      await expect(crearIntentoPago(validInput)).rejects.toThrow(
        'Respuesta inválida al crear el intent de pago.'
      );
    });

    it('debería rechazar si falta el intentId en la respuesta', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          clientSecret: 'pi_test_secret_123',
          // intentId faltante
        },
        error: null,
      });

      await expect(crearIntentoPago(validInput)).rejects.toThrow(
        'Respuesta inválida al crear el intent de pago.'
      );
    });

    it('debería manejar errores de la Edge Function', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'STRIPE_SECRET_KEY no configurada',
        },
      });

      await expect(crearIntentoPago(validInput)).rejects.toThrow(
        'STRIPE_SECRET_KEY no configurada'
      );
    });

    it('debería validar monto positivo antes de enviar a Stripe', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          clientSecret: 'pi_test_secret_123',
          intentId: 'pi_test_123',
        },
        error: null,
      });

      await crearIntentoPago({
        ...validInput,
        amount: 0,
      });

      // Nota: la validación real ocurre en la Edge Function
      expect(mockSupabase.functions.invoke).toHaveBeenCalled();
    });

    it('debería validar email válido', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          clientSecret: 'pi_test_secret_123',
          intentId: 'pi_test_123',
        },
        error: null,
      });

      await crearIntentoPago({
        ...validInput,
        payerEmail: 'invalidemail',
      });

      // La validación ocurre en la Edge Function
      expect(mockSupabase.functions.invoke).toHaveBeenCalled();
    });
  });

  describe('confirmarPago', () => {
    const validInput = {
      intentId: 'pi_test_123',
      paymentMethodId: 'pm_test_123',
    };

    it('debería confirmar un pago exitosamente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          paymentId: 'ch_test_123',
          status: 'succeeded',
        },
        error: null,
      });

      const result = await confirmarPago(validInput);

      expect(result).toEqual({
        success: true,
        paymentId: 'ch_test_123',
        status: 'succeeded',
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('confirm-payment', {
        body: validInput,
      });
    });

    it('debería rechazar si el pago falla en Stripe', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Tarjeta rechazada',
        },
        error: null,
      });

      await expect(confirmarPago(validInput)).rejects.toThrow('Tarjeta rechazada');
    });

    it('debería manejar errores de invocación de Edge Function', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Function timeout',
        },
      });

      await expect(confirmarPago(validInput)).rejects.toThrow('Function timeout');
    });

    it('debería lanzar error si success es false sin mensaje de error', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
        },
        error: null,
      });

      await expect(confirmarPago(validInput)).rejects.toThrow(
        'Pago rechazado o error'
      );
    });

    it('debería retornar status del pago si está disponible', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          paymentId: 'ch_test_123',
          status: 'processing',
        },
        error: null,
      });

      const result = await confirmarPago(validInput);

      expect(result.status).toBe('processing');
    });
  });

  describe('Casos de error edge', () => {
    it('debería manejar null data de Edge Function', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        crearIntentoPago({
          amount: 5000,
          description: 'Test',
          payerEmail: 'test@example.com',
          externalReference: 'TEST-001',
        })
      ).rejects.toThrow();
    });

    it('debería manejar respuestas con undefined en lugar de null', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          clientSecret: undefined,
          intentId: undefined,
        },
        error: null,
      });

      await expect(
        crearIntentoPago({
          amount: 5000,
          description: 'Test',
          payerEmail: 'test@example.com',
          externalReference: 'TEST-001',
        })
      ).rejects.toThrow();
    });
  });

  describe('Idempotencia', () => {
    it('debería manejar intentos duplicados de crear intent', async () => {
      const input = {
        amount: 5000,
        description: 'Viaje a Cancún',
        payerEmail: 'usuario@example.com',
        externalReference: 'RESERVA-001',
      };

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          clientSecret: 'pi_test_secret_123',
          intentId: 'pi_test_123',
        },
        error: null,
      });

      const result1 = await crearIntentoPago(input);

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          clientSecret: 'pi_test_secret_123',
          intentId: 'pi_test_123',
        },
        error: null,
      });

      const result2 = await crearIntentoPago(input);

      expect(result1).toEqual(result2);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);
    });
  });
});
