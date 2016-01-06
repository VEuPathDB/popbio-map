L.Control.MapLegend = L.Control.extend({
    options: {
        position: 'bottomright',
        numberOfColors: 20,
        sortType: 'color'
    },


    createLegend: function () {
        this._legendDiv = L.DomUtil.create('div', 'info legend');
        legendDiv = this._legendDiv;

        L.easyButton('fa-info',
            function () {
                if (L.DomUtil.hasClass(legendDiv, "active")) {
                    legend.removeFrom(map);
                    L.DomUtil.removeClass(legendDiv, "active");
                } else {
                    legend.addTo(map);
                    L.DomUtil.addClass(legendDiv, "active");
                }

            },
            'Toggle legend ON of OFF'
        );


    },


    // Get a simple associative array (key-value) and sort it by value
    sortHashByValue: function (hash) {
        var tupleArray = [];
        for (var key in hash) if (hash.hasOwnProperty(key)) tupleArray.push([key, hash[key]]);
        tupleArray.sort(function (a, b) {
            return b[1] - a[1]
        });
        return tupleArray;
    },


    /*
     function buildPalette
     date: 17/03/2015
     purpose:
     inputs: {items} a list of items to be associated with colors,
     {mColors} the number of maximum colors in the palette
     {paletteType} 1 for Kelly's 2 for Boytons'
     outputs: an associative array with items names as the keys and color as the values
     */
    buildPalette: function (items, nmColors, paletteType) {


        var newPalette = [];

        // from http://stackoverflow.com/questions/470690/how-to-automatically-generate-n-distinct-colors
        var kelly_colors_hex = [
            "#FFB300", // Vivid Yellow
            "#803E75", // Strong Purple
            "#FF6800", // Vivid Orange
            "#A6BDD7", // Very Light Blue
            "#C10020", // Vivid Red
            "#CEA262", // Grayish Yellow
            "#817066", // Medium Gray

            // The following don't work well for people with defective color vision
            "#007D34", // Vivid Green
            "#F6768E", // Strong Purplish Pink
            "#00538A", // Strong Blue
            "#FF7A5C", // Strong Yellowish Pink
            "#53377A", // Strong Violet
            "#FF8E00", // Vivid Orange Yellow
            "#B32851", // Strong Purplish Red
            "#F4C800", // Vivid Greenish Yellow
            "#7F180D", // Strong Reddish Brown
            "#93AA00", // Vivid Yellowish Green
            "#593315", // Deep Yellowish Brown
            "#F13A13", // Vivid Reddish Orange
            "#232C16" // Dark Olive Green
        ];

        // from http://alumni.media.mit.edu/~wad/color/palette.html
        var boytons_colors_hex = [
            //"#000000", // Black
            "#575757", // Dark Gray
            "#A0A0A0", // Light Gray
            "#FFFFFF", // White
            "#2A4BD7", // Blue
            "#1D6914", // Green
            "#814A19", // Brown
            "#8126C0", // Purple
            "#9DAFFF", // Light Purple
            "#81C57A", // Light Green
            "#E9DEBB", // Cream
            "#AD2323", // Red
            "#29D0D0", // Teal
            "#FFEE33", // Yellow
            "#FF9233", // Orange
            "#FFCDF3"  // Pink
        ];

        var noItems = items.length,
            stNoItems = noItems;

        for (var i = 0; i < nmColors; i++) {
            if (typeof (items[i]) !== 'undefined') {
                var item = items[i][0];
                newPalette[item] = kelly_colors_hex[i];
                //console.log(item);

                noItems--; // track how many items don't have a proper color
            }

        }

        var lumInterval = 0.5 / noItems,
            lum = 0.7;
        for (var c = 0; c < noItems; c++) {
            var element = stNoItems - noItems + c;
            var item = items[element][0];
            newPalette[item] = colorLuminance("#FFFFFF", -lum);
            lum -= lumInterval;
            //console.log(item);


        }

        newPalette["others"] = "radial-gradient(" + colorLuminance("#FFFFFF", -0.7) + ", " + colorLuminance("#FFFFFF", -lum) + ")";
        newPalette["Unknown"] = "black";

        return newPalette;
    },


    // taken from http://jsfiddle.net/shanfan/ojgp5718/

    Color: function Color(hexVal) { //define a Color class for the color objects
        this.hex = hexVal;
    },

    constructColor: function (colorObj) {
        var hex = colorObj.hex.substring(1);
        /* Get the RGB values to calculate the Hue. */
        var r = parseInt(hex.substring(0, 2), 16) / 255;
        var g = parseInt(hex.substring(2, 4), 16) / 255;
        var b = parseInt(hex.substring(4, 6), 16) / 255;

        /* Getting the Max and Min values for Chroma. */
        var max = Math.max.apply(Math, [r, g, b]);
        var min = Math.min.apply(Math, [r, g, b]);


        /* Variables for HSV value of hex color. */
        var chr = max - min;
        var hue = 0;
        var val = max;
        var sat = 0;


        if (val > 0) {
            /* Calculate Saturation only if Value isn't 0. */
            sat = chr / val;
            if (sat > 0) {
                if (r == max) {
                    hue = 60 * (((g - min) - (b - min)) / chr);
                    if (hue < 0) {
                        hue += 360;
                    }
                } else if (g == max) {
                    hue = 120 + 60 * (((b - min) - (r - min)) / chr);
                } else if (b == max) {
                    hue = 240 + 60 * (((r - min) - (g - min)) / chr);
                }
            }
        }
        colorObj.chroma = chr;
        colorObj.hue = hue;
        colorObj.sat = sat;
        colorObj.val = val;
        colorObj.luma = 0.3 * r + 0.59 * g + 0.11 * b;
        colorObj.red = parseInt(hex.substring(0, 2), 16);
        colorObj.green = parseInt(hex.substring(2, 4), 16);
        colorObj.blue = parseInt(hex.substring(4, 6), 16);
        return colorObj;
    },

    sortColorsByHue: function (colors) {
        var tuples = [];
        var sortedPallete = [];
        for (var colorsKey in colors) if (colors.hasOwnProperty(colorsKey)) {
            tuples.push([colorsKey, colors[colorsKey]])
        }

        tuples.sort(function (a, b) {
            a = a[1];
            b = b[1];

            return a.hue - b.hue;
        });

        for (var i = 0; i < tuples.length; i++) {
            var key = tuples[i][0];
            var value = tuples[i][1];
            sortedPallete[key] = value.hex;  // keep only the hex value
        }

        return sortedPallete;
    },

    outputColors: function (hexArray) {
        var colors = [];
        var cntLegend = 1;
        for (var paletteKey in palette) if (palette.hasOwnProperty(paletteKey)) {
            if (cntLegend > legendSpecies - 1) break;
            var color = new this.Color(palette[paletteKey]);
            this.constructColor(color);
            colors[paletteKey] = color;
            cntLegend++
        }

        return this.sortColorsByHue(colors);

    },

    legendHTML: function (palette) {
        var inHtml = "";
        var cntLegend = 1;
        for (var obj1 in palette) if (palette.hasOwnProperty(obj1)) {
            if (cntLegend > legendSpecies - 1) {
                inHtml += '<i style="background:' + palette["others"] + ';"></i> ' + 'Others<br />';
                $("#legend").html(inHtml);
                break;
            }
            var abbrSpecies = obj1.replace(/^(\w{2})\S+\s(\w+)/, "$1. $2");
            inHtml += '<i style="background:' + palette[obj1] + ';" title="' + obj1 + '"></i> ' + (obj1 ? '<em>' + abbrSpecies + '</em><br>' : '+');
            cntLegend++;
        }

        if ($('#view-mode').val() === 'ir') {

            inHtml += '<div class="data-layer-legend" style="border: 0">';
            inHtml += '<p>Resistance</p>';
            inHtml += '<div class="min-value" style="border: 0">Low</div>';
            inHtml += '<div class="scale-bars">';
            var colorsArr = L.ColorBrewer.Diverging.RdYlBu[10].slice(); //copy array by value
            $.each(colorsArr.reverse(), function (index, value) {
                inHtml += '<i style="margin: 0; border-radius: 0; border: 0; color: ' + value + '; width: 10px; background-color: ' + value + ' ;"></i>';
            });

            inHtml += '</div>' +
                '<div class="max-value" style="border: 0;">High</div></div>' +
                '<p style="font-size: smaller; word-wrap: break-word; width: 200px; margin-top: 20px;">' +
                'Values have been rescaled globally and only give a relative indication of resistance/susceptibility</p>';


        }

        // Populate legend when added to map
        legend.onAdd = function (map) {
            this._legendDiv.innerHTML = inHtml;
            return this._legendDiv;
        };

        // Was the legend already active? Refresh it!
        if (L.DomUtil.hasClass(this._legendDiv, "active")) {
            legend.removeFrom(map);
            legend.addTo(map);
        }

    }

});

L.control.legend = function (url, options) {


    var newLegend = new L.Control.MapLegend(options);

    newLegend.createLegend();
    $.getJSON(url, generatePalette);

    function generatePalette(result) {


        var doc = result.facet_counts.facet_pivot["geohash_2,species_category"];
        var items = [];
        for (var obj in doc) if (doc.hasOwnProperty(obj)) {
            var count = doc[obj].count;

            var pivot = doc[obj].pivot;
            for (var pivotElm in pivot) if (pivot.hasOwnProperty(pivotElm)) {
                var ratio = pivot[pivotElm].count / count;
                var species = pivot[pivotElm].value;
                var index = parseInt(pivotElm);
                var points;
                // Use a scoring scheme to make sure species with a good presence per region get a proper color (we only have 20 good colours)
                switch (index) {
                    case 1:
                        points = 7 * ratio;
                        break;
                    case 2:
                        points = 3 * ratio;
                        break;
                    case 3:
                        points = 1 * ratio;
                        break;
                    default:
                        points = 0;
                        break

                }

                if (items.hasOwnProperty(species)) {
                    items[species] += points;

                } else {

                    items[species] = points;

                }
            }
        }

        // this is where the legend items are sorted
        var sortedItems = newLegend.sortHashByValue(items);
        //this.sortHashByValue(items);
        palette = newLegend.buildPalette(sortedItems, legendSpecies, 1);

        var sortedPalette;
        if (this.sortType === 'name') {


        } else {    // sort by color

            sortedPalette = newLegend.outputColors(palette);
        }

        newLegend.legendHTML(sortedPalette);


        // moved this here to avoid querying SOLR before the palette is done building
        loadSolr({clear: 1, zoomLevel: map.getZoom()});
    }

    return newLegend;
};