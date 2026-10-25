/**
 * Spring Boot Native WebSocket Adapter
 * Emulates the Socket.IO client interface for seamless frontend compatibility.
 */
(function(window) {
    function SimpleSocket(url) {
        this.listeners = {};
        this.queue = [];
        this.connected = false;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = url || (protocol + "//" + window.location.host + "/ws");

        this.ws = new WebSocket(wsUrl);

        const self = this;

        this.ws.onopen = function() {
            self.connected = true;
            self._trigger("connect");
            while (self.queue.length > 0) {
                const msg = self.queue.shift();
                self.ws.send(JSON.stringify(msg));
            }
        };

        this.ws.onclose = function() {
            self.connected = false;
            self._trigger("disconnect");
        };

        this.ws.onerror = function(err) {
            self._trigger("error", err);
        };

        this.ws.onmessage = function(event) {
            try {
                const packet = JSON.parse(event.data);
                if (packet && packet.event) {
                    self._trigger(packet.event, packet.data);
                }
            } catch (e) {
                console.error("Failed to parse websocket message", e);
            }
        };
    }

    SimpleSocket.prototype.on = function(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    };

    SimpleSocket.prototype.off = function(event, callback) {
        if (!this.listeners[event]) return;
        if (!callback) {
            delete this.listeners[event];
        } else {
            this.listeners[event] = this.listeners[event].filter(function(cb) {
                return cb !== callback;
            });
        }
    };

    SimpleSocket.prototype.emit = function(event, data) {
        const packet = { event: event, data: data };
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(packet));
        } else {
            this.queue.push(packet);
        }
    };

    SimpleSocket.prototype._trigger = function(event, data) {
        const cbs = this.listeners[event];
        if (cbs) {
            cbs.forEach(function(cb) {
                try {
                    cb(data);
                } catch (e) {
                    console.error("Error in event listener for " + event, e);
                }
            });
        }
    };

    window.io = function(url) {
        return new SimpleSocket(url);
    };
})(window);
