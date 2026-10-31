#!/usr/bin/env python3
import json,os
from pathlib import Path
e=os.environ
required=['MATRIX_SERVER_NAME','MATRIX_DB_PASSWORD','MATRIX_REGISTRATION_SECRET','TURN_SECRET','TURN_HOST','APP_ORIGIN']
for key in required:
 if not e.get(key):raise SystemExit(f'Missing {key}')
config={
 'server_name':e['MATRIX_SERVER_NAME'],'public_baseurl':e['APP_ORIGIN']+'/',
 'pid_file':'/data/homeserver.pid','listeners':[{'port':8008,'tls':False,'type':'http','x_forwarded':True,'bind_addresses':['0.0.0.0'],'resources':[{'names':['client'],'compress':False}]}],
 'database':{'name':'psycopg2','args':{'user':'nexus_matrix','password':e['MATRIX_DB_PASSWORD'],'database':'nexus_matrix','host':'postgres','port':5432,'cp_min':5,'cp_max':10}},
 'log_config':'/data/log.config','media_store_path':'/data/media_store','signing_key_path':'/data/homeserver.signing.key',
 'registration_shared_secret':e['MATRIX_REGISTRATION_SECRET'],'enable_registration':False,'report_stats':False,'trusted_key_servers':[],
 'federation_domain_whitelist':[],'allow_public_rooms_over_federation':False,'allow_profile_lookup_over_federation':False,
 'max_upload_size':'25M','enable_media_repo':True,'url_preview_enabled':False,'session_lifetime':'7d',
 'rc_login':{'address':{'per_second':0.05,'burst_count':10},'account':{'per_second':0.02,'burst_count':5}},
 'rc_message':{'per_second':0.5,'burst_count':20},
 'turn_uris':[f"turn:{e['TURN_HOST']}:3478?transport=udp",f"turn:{e['TURN_HOST']}:3478?transport=tcp"],
 'turn_shared_secret':e['TURN_SECRET'],'turn_user_lifetime':'1h','turn_allow_guests':False
}
if e.get('EMAIL_ENABLED')=='true':
 for key in ['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','SMTP_FROM']:
  if not e.get(key):raise SystemExit(f'Missing {key} for email verification')
 config['enable_registration']=e.get('REGISTRATION_OPEN')=='true'
 config['registrations_require_3pid']=['email']
 config['email']={'smtp_host':e['SMTP_HOST'],'smtp_port':int(e.get('SMTP_PORT','587')),'smtp_user':e['SMTP_USER'],'smtp_pass':e['SMTP_PASSWORD'],'require_transport_security':True,'notif_from':e['SMTP_FROM'],'app_name':'NEXUS','enable_notifs':False}
logs={'version':1,'formatters':{'normal':{'format':'%(asctime)s %(name)s %(levelname)s %(message)s'}},'handlers':{'console':{'class':'logging.StreamHandler','formatter':'normal'}},'loggers':{'synapse.http':{'level':'WARNING'}},'root':{'level':'WARNING','handlers':['console']},'disable_existing_loggers':False}
data=Path('/data');data.mkdir(exist_ok=True)
for name,value in [('homeserver.yaml',config),('log.config',logs)]:
 path=data/name;path.write_text(json.dumps(value,indent=2));path.chmod(0o600);os.chown(path,991,991)
os.chown(data,991,991)
turn=Path('/turn');turn.mkdir(exist_ok=True)
lines=['listening-port=3478','fingerprint','use-auth-secret',f"static-auth-secret={e['TURN_SECRET']}",f"realm={e['MATRIX_SERVER_NAME']}",'min-port=49160','max-port=49200','no-cli','no-multicast-peers','no-tls','no-dtls','stale-nonce=600','total-quota=200','user-quota=12','log-file=stdout','no-software-attribute','denied-peer-ip=0.0.0.0-0.255.255.255','denied-peer-ip=10.0.0.0-10.255.255.255','denied-peer-ip=127.0.0.0-127.255.255.255','denied-peer-ip=169.254.0.0-169.254.255.255','denied-peer-ip=172.16.0.0-172.31.255.255','denied-peer-ip=192.168.0.0-192.168.255.255','denied-peer-ip=::1']
if e.get('TURN_EXTERNAL_IP'):lines.append('external-ip='+e['TURN_EXTERNAL_IP'])
path=turn/'turnserver.conf';path.write_text('\n'.join(lines)+'\n');path.chmod(0o644)
print('Service configuration prepared. Secrets omitted from output.')
