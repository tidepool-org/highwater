highwater
=========

Tidepool's metrics endpoint -- it can funnel data to an offsite metrics platform while stripping it of identifiable information in a way that complies with HIPAA requirements.

Tidepool applications and servers can communicate with this metrics endpoint and include useful information to enable analysis on a per-user basis -- but such information is obfuscated before being passed off to a third party metrics tracking service.

Endpoints are all mapped to /metrics in the router and include:

    GET /user/:userid?_ev=event/key1=value1/key2=value2...
    GET /thisuser?_ev...

    GET /server/:serverid?_ev=event/key1=value1/key2=value2...

Metrics are forwarded to KISSmetrics with a masked userid (which is to say that userid is hashed and only the hash is stored in the metrics system)

The metrics system does not block; all metrics recording takes place asynchronously and all calls return 200 with an empty body.

Currently, the metrics package supports three metrics systems.

KISSMetrics normal metrics requires that the config include METRICS_APIKEY for KISSMetrics; if that key is empty (it cannot be missing entirely), no KISSMetrics logging will be attempted.

KISSMetrics whitelist metrics requires that the logging include a key for METRICS_UCSF_APIKEY; if it's missing (but the METRICS_APIKEY is still present) then the whitelist metrics will be omitted but KISSMetrics logging will still take place.

If all three values are missing, then the metrics system is a no-op. This is useful when running a local stack.

