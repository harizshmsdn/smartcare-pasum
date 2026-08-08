import re
import os

with open('main.py', 'r') as f:
    lines = f.readlines()

routers = {
    'auth': [],
    'admin': [],
    'student': [],
    'attendance': [],
    'cases': [],
    'misc': []
}

current_router = 'misc'
imports = []
main_app = []

in_endpoint = False
endpoint_lines = []

for line in lines:
    if line.startswith('import ') or line.startswith('from '):
        imports.append(line)
    elif line.startswith('app = FastAPI') or line.startswith('app.add_middleware') or 'CORSMiddleware' in line or 'allow_origins' in line or 'allow_credentials' in line or 'allow_methods' in line or 'allow_headers' in line or line.strip() == ')' and 'CORSMiddleware' in ''.join(main_app[-5:]):
        main_app.append(line)
    elif line.startswith('@app.'):
        # Start of an endpoint
        if in_endpoint:
            routers[current_router].extend(endpoint_lines)
            endpoint_lines = []
            
        in_endpoint = True
        
        # Determine router by path
        if '"/api/v1/auth' in line:
            current_router = 'auth'
        elif '"/api/v1/admin' in line:
            current_router = 'admin'
        elif '"/api/v1/student' in line:
            current_router = 'student'
        elif '"/api/v1/session' in line or '"/api/v1/face-verification' in line:
            current_router = 'attendance'
        elif '"/api/v1/interventions' in line or '"/api/v1/merit' in line:
            current_router = 'cases'
        else:
            current_router = 'misc'
            
        endpoint_lines.append(line)
    elif line.startswith('def get_current_user'):
        in_endpoint = True
        current_router = 'auth'
        endpoint_lines.append(line)
    elif in_endpoint:
        # Check if endpoint ended (next line is a top-level def or app.)
        if line.startswith('def ') and not line.startswith('def get_'):
            # wait, this logic is tricky
            endpoint_lines.append(line)
        else:
            endpoint_lines.append(line)
    else:
        if line.strip() and not line.startswith('JWT_') and not line.startswith('DATABASE_URL') and not line.startswith('ENV') and not line.startswith('IS_PRODUCTION') and not line.startswith('def get_db_connection'):
            main_app.append(line)

if in_endpoint:
    routers[current_router].extend(endpoint_lines)

# Write routers
for router_name, router_lines in routers.items():
    if not router_lines:
        continue
    
    with open(f'routers/{router_name}.py', 'w') as f:
        f.write('from fastapi import APIRouter, HTTPException, Depends, Header, Body, UploadFile, File, Form\n')
        f.write('from typing import Optional, List\n')
        f.write('import psycopg2\n')
        f.write('from psycopg2.extras import RealDictCursor\n')
        f.write('from models.schemas import *\n')
        f.write('from core.database import get_db, get_db_connection\n')
        f.write('\n')
        f.write(f'router = APIRouter(prefix="/api/v1", tags=["{router_name}"])\n\n')
        
        # Replace @app. with @router. and remove /api/v1 from path
        modified_lines = []
        for rl in router_lines:
            if rl.startswith('@app.'):
                rl = rl.replace('@app.', '@router.')
                rl = rl.replace('"/api/v1', '"')
            modified_lines.append(rl)
            
        f.writelines(modified_lines)

print("Split completed.")
