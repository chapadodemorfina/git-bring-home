-- Schedule cron job to process notifications every minute
SELECT cron.schedule(
  'process-notifications-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://moijoyqwapimforpijdc.supabase.co/functions/v1/process-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vaWpveXF3YXBpbWZvcnBpamRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTYwMzgsImV4cCI6MjA4ODQzMjAzOH0.eOPsWZsp-j04MNiW1saNm9cWTN8giZ5H0L86GH3acNo"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);