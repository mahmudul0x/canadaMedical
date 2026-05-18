import os
import sys
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('canadamed')

# Read config from Django settings, namespace CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks.py in every INSTALLED_APP
app.autodiscover_tasks()

# Windows: prefork pool uses Unix semaphores which are not supported.
# Fall back to solo pool so workers start without PermissionError (WinError 5).
if sys.platform == 'win32':
    app.conf.worker_pool = 'solo'
