import sys

log_path = r'C:\Users\usuario\.gemini\antigravity\brain\7cab5371-9b93-461e-8fdc-b42372e7bb99\.system_generated\logs\overview.txt'

try:
    with open(log_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    extracted = []
    capture = False
    
    for line in lines:
        if "File Path: `file:///c:/Users/usuario/MiPrimerApp/app/%28tabs%29/rutas.tsx`" in line:
            capture = True
            extracted = []
            continue
            
        if capture:
            if "The above content" in line:
                capture = False
                # If we captured a decent amount of lines (e.g., > 500), we probably found the big view_file
                if len(extracted) > 500:
                    break
            else:
                extracted.append(line)
                
    if len(extracted) > 500:
        # remove prefix line numbers like "1: ", "200: ", etc.
        cleaned = []
        for line in extracted:
            # find first colon
            idx = line.find(': ')
            if idx != -1 and line[:idx].isdigit():
                cleaned.append(line[idx+2:])
            else:
                cleaned.append(line)
                
        with open(r'c:\Users\usuario\MiPrimerApp\app\(tabs)\rutas.tsx', 'w', encoding='utf-8') as f:
            f.writelines(cleaned)
        print(f"RECOVERED: {len(cleaned)} lines")
    else:
        print(f"FAILED TO FIND LARGE BACKUP. Found {len(extracted)} lines.")

except Exception as e:
    print(f"ERROR: {e}")
