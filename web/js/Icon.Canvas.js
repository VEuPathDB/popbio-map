L.Icon.Canvas = L.Icon.extend({
    options: {
        iconSize: new L.Point(20, 20), // Have to be supplied
        className: 'leaflet-canvas-icon',
        population: 0,
        stats: []
    },

    createIcon: function () {
        var e = document.createElement('canvas');
        this._setIconStyles(e, 'icon');
        var s = this.options.iconSize;
        var pop = this.options.population;
        e.width = s.x;
        e.height = s.y;
        e.id = this.options.id;
        this.draw(e.getContext('2d'), s.x, s.y);
        return e;
    },

    createShadow: function () {
        return null;
    },

    draw: function (canvas, width, height) {

        var iconSize = this.options.iconSize.x, iconSize2 = iconSize / 2, iconSize3 = iconSize / 2.5, iconSize4 = iconSize / 3;
        var pi2 = Math.PI * 2;

        var start = Math.PI * 1.5;
        //var start = Math.PI * 2;
        var stats = this.options.stats;
        var markerText = this.options.markerText;
        var count = this.options.count;
        // var cumulativeCount = this.options.cumulativeCount;
        stats.forEach(function (el) {


            var size = el.value / count;
            var label = el.label;

            if (size > 0) {
                canvas.beginPath();
                canvas.moveTo(iconSize2, iconSize2);
                canvas.fillStyle = el.color;

                var from = start,
                    to = start + size * pi2;

                if (to < from) {
                    from = start;
                }
                canvas.arc(iconSize2, iconSize2, iconSize2, from, to);

                start = start + size * pi2;
                canvas.lineTo(iconSize2, iconSize2);
                canvas.fill();
                canvas.closePath();
            }

        });

        // Draw the marker background

        canvas.beginPath();
        canvas.fillStyle = 'white';
        canvas.arc(iconSize2, iconSize2, iconSize3, 0, Math.PI * 2);
        canvas.fill();
        canvas.closePath();

        var colors = legend.markerColor(this.options.trafficlight);

        // Draw the marker fill color (white if now value)

        canvas.beginPath();
        canvas.fillStyle = colors[0];
        canvas.arc(iconSize2, iconSize2, iconSize4, 0, Math.PI * 2);
        canvas.fill();
        canvas.closePath();
        canvas.fillStyle = colors[1];

        canvas.textAlign = 'center';
        canvas.textBaseline = 'middle';
        canvas.font = 'bold 12px sans-serif';


        canvas.fillText(markerText, iconSize2, iconSize2, iconSize);
    }
});
