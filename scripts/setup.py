#!/usr/bin/env python3
"""Create local secrets without putting them in command arguments or output."""
import argparse,base64,getpass,os,re,secrets
from pathlib import Path
from urllib.parse import urlparse
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--origin',default='http://localhost:8080');p.add_argument('--server-name',default='localhost');p.add_argument('--turn-host',default='localhost');p.add_argument('--turn-ip',default='');args=p.parse_args()
if (root/'.env').exists():raise SystemExit('.env already exists. Keep its secrets and edit it carefully; setup will not replace it.')
url=urlparse(args.origin)
if url.scheme not in ('http','https') or not url.hostname or url.path not in ('','/') or url.query or url.fragment:raise SystemExit('Use an origin such as https://chat.example.com')
for value in (args.server_name,args.turn_host):
 if not re.fullmatch(r'[a-zA-Z0-9.-]+',value):raise SystemExit('Server and TURN host must be DNS names without ports.')
if url.scheme=='http' and url.hostname not in ('localhost','127.0.0.1'):raise SystemExit('Use HTTPS for remote deployment.')
password=getpass.getpass('Choose the NEXUS owner password (at least 12 characters): ')
if len(password)<12 or len(password)>128 or any(c in password for c in ('\n','\r','\0',"'")):raise SystemExit('Use 12–128 characters without newlines, NUL or a single quote.')
if password!=getpass.getpass('Repeat owner password: '):raise SystemExit('Passwords do not match.')
token=lambda:secrets.token_urlsafe(32)
app_db=token();matrix_db=token();production=url.scheme=='https'
values={'APP_ORIGIN':args.origin.rstrip('/'),'NODE_ENV':'production' if production else 'development','PORT':'3000','TRUST_PROXY':'2' if production else '1','DATABASE_URL':f'postgresql://nexus_app:{app_db}@postgres:5432/nexus_app','REALTIME_DATABASE_URL':f'postgresql://nexus_app:{app_db}@postgres:5432/nexus_app','TOKEN_ENCRYPTION_KEY':secrets.token_hex(32),'POSTGRES_ADMIN_PASSWORD':token(),'NEXUS_DB_PASSWORD':app_db,'MATRIX_DB_PASSWORD':matrix_db,'MATRIX_INTERNAL_URL':'http://synapse:8008','MATRIX_SERVER_NAME':args.server_name,'MATRIX_REGISTRATION_SECRET':token(),'MATRIX_SERVICE_USERNAME':'nexus_service','MATRIX_SERVICE_PASSWORD':token(),'ADMIN_USERNAME':'owner','ADMIN_PASSWORD':password,'ADMIN_TOTP_SECRET':base64.b32encode(secrets.token_bytes(20)).decode().rstrip('='),'REGISTRATION_OPEN':'true','TURN_SECRET':token(),'TURN_HOST':args.turn_host,'TURN_EXTERNAL_IP':args.turn_ip,'NEXUS_DOMAIN':url.hostname}
fd=os.open(root/'.env',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:
 for k,v in values.items():f.write(f"{k}='{v}'\n")
print('Created private configuration. Add ADMIN_TOTP_SECRET from .env to your authenticator as a SHA1 / 6-digit / 30-second account. Do not share the file.')
