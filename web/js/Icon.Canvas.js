L.Icon.Canvas = L.Icon.extend({
    options: {
        iconSize: new L.Point(20, 20), // Have to be supplied
        /*
         iconAnchor: (Point)
         popupAnchor: (Point)
         */
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
        this.draw(e.getContext('2d'), s.x, s.y);
        return e;
    },

    createShadow: function () {
        return null;
    },

    draw: function (canvas, width, height) {

        var iconSize = this.options.iconSize.x, iconSize2 = iconSize / 2, iconSize3 = iconSize / 2.5;
        var pi2 = Math.PI * 2;

        var start = Math.PI * 1.5;
        //var start = Math.PI * 2;
        for (var key in this.options.stats) if (this.options.stats.hasOwnProperty(key)) {

            var size = this.options.stats[key] / this.options.population;
            //console.log(key + "-" + this.options.stats[key]);

            if (size > 0) {
                canvas.beginPath();
                canvas.moveTo(iconSize2, iconSize2);
                if (palette.hasOwnProperty(key)) {
                    //console.log(key + '=' + palette[key])
                    canvas.fillStyle = palette[key];
                } else {
                    canvas.fillStyle = palette["others"];
                    //console.log(key + '*' + palette["others"]);
                }

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

        }

        canvas.beginPath();
        canvas.fillStyle = 'white';
        canvas.arc(iconSize2, iconSize2, iconSize3, 0, Math.PI * 2);
        canvas.fill();
        canvas.closePath();

        canvas.fillStyle = '#555';
        canvas.textAlign = 'center';
        canvas.textBaseline = 'middle';
        canvas.font = 'bold 12px sans-serif';

        canvas.fillText(this.options.population, iconSize2, iconSize2, iconSize);
    }
});
