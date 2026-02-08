// Timer Manager
// Handles game loops and timing intervals

(function() {
    let levelTimerId = null;
    let survivalTimerId = null;

    window.GameTimer = {
        /**
         * Start the level timer (used for score/time reward updates)
         * @param {Function} callback - Function to call on each tick
         * @param {number} intervalMs - Tick interval in ms (default 100)
         */
        startLevel: (callback, intervalMs = 100) => {
            if (levelTimerId) clearInterval(levelTimerId);
            if (typeof callback === 'function') {
                levelTimerId = setInterval(callback, intervalMs);
            }
        },

        /**
         * Stop the level timer
         */
        stopLevel: () => {
            if (levelTimerId) {
                clearInterval(levelTimerId);
                levelTimerId = null;
            }
        },

        /**
         * Start the survival mode timer
         * @param {Function} callback - Function to call on each tick
         * @param {number} intervalMs - Tick interval in ms (default 1000)
         */
        startSurvival: (callback, intervalMs = 1000) => {
            if (survivalTimerId) clearInterval(survivalTimerId);
            if (typeof callback === 'function') {
                survivalTimerId = setInterval(callback, intervalMs);
            }
        },

        /**
         * Stop the survival mode timer
         */
        stopSurvival: () => {
            if (survivalTimerId) {
                clearInterval(survivalTimerId);
                survivalTimerId = null;
            }
        },

        /**
         * Stop all active timers
         */
        stopAll: () => {
            window.GameTimer.stopLevel();
            window.GameTimer.stopSurvival();
        },

        /**
         * Check if level timer is running
         */
        isLevelRunning: () => !!levelTimerId
    };
})();
