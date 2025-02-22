"use strict";

(function (global)
{
    "use strict";

    // Model

    function vec2_t(x, y)
    {
        this.x = x;
        this.y = y;
    };

    function Needle()
    {
        // [0, 1)
        this.x = 0;
        this.y = 0;

        this.minx = 0;
        this.maxx = 0;

        // [0, 2*pi)
        this.theta = 0;

        // 1 or -1
        this.handedness = 1;
    }

    // Controller

    function generatePolygonNeedles(polygon, num, scale)
    {
        var newNeedles = [];
        var newHits = 0;

        for (var i = 0; i < num; i++)
        {
            var needle = new Needle();

            needle.theta = Math.random() * 2 * Math.PI;

            if (Math.random() < 0.5)
                needle.handedness = -1;

            // find shape dimensions
            var maxCoord = new vec2_t(0, 0);
            var minCoord = new vec2_t(0, 0);

            var numSides = polygon.sides.length;

            var currentCoord = new vec2_t(0, 0);

            var thisAngle = 0;
            for (var j = 0; j < numSides; j++)
            {
                thisAngle += (j === 0 ? needle.theta : Math.PI - polygon.angles[j-1]) * needle.handedness;
                var thisSide = scale * polygon.sides[j] / polygon.extent;

                currentCoord.x += thisSide * Math.cos(thisAngle);
                currentCoord.y += thisSide * Math.sin(thisAngle);

                if (currentCoord.x > maxCoord.x)
                    maxCoord.x = currentCoord.x;
                if (currentCoord.y > maxCoord.y)
                    maxCoord.y = currentCoord.y;
                if (currentCoord.x < minCoord.x)
                    minCoord.x = currentCoord.x;
                if (currentCoord.y < minCoord.y)
                    minCoord.y = currentCoord.y;
            }

            // find the actual position
            needle.x = Math.random();
            needle.y = Math.random() /* - ((maxCoord.y + minCoord.y) / 2) */ ;

            needle.minx = minCoord.x;
            needle.maxx = maxCoord.x;

            newNeedles.push(needle);

            // calculate number of hits
            var currentY = needle.y;

            thisAngle = 0;
            for (var j = 0; j < numSides; j++)
            {
                thisAngle += (j === 0 ? needle.theta : Math.PI - polygon.angles[j-1]) * needle.handedness;
                var thisSide = scale * polygon.sides[j] / polygon.extent;

                var prevY = currentY;
                currentY += thisSide * Math.sin(thisAngle);

                if ((prevY <= 0 && 0 <= currentY) || (prevY >= 0 && 0 >= currentY))
                    newHits++;

                if ((prevY <= 1 && 1 <= currentY) || (prevY >= 1 && 1 >= currentY))
                    newHits++;
            }
        }

        return {'needles': newNeedles, 'numHits': newHits};
    }

    function generateCircleNeedles(num, diameter)
    {
        var newNeedles = [];
        var newHits = 0;

        var radius = diameter / 2;

        for (var i = 0; i < num; i++)
        {
            var needle = new Needle();

            // find the position
            needle.x = Math.random();
            needle.y = Math.random();

            needle.minx = -radius;
            needle.maxx = radius;

            newNeedles.push(needle);

            // calculate number of hits
            // this assumes diameter <= distance between lines == 1
            var circleMinY = needle.y - radius;
            var circleMaxY = needle.y + radius;
            if ((circleMinY <= 0 && 0 <= circleMaxY) || (circleMaxY >= 0 && 0 >= circleMinY) || (circleMinY <= 1 && 1 <= circleMaxY) || (circleMaxY >= 1 && 1 >= circleMinY))
                newHits += 2;
        }

        return {'needles': newNeedles, 'numHits': newHits};
    }

    function receiveNeedleRequest(polygon, num, scale)
    {
        if (polygon !== null)
            return generatePolygonNeedles(polygon, num, scale);
        else
            return generateCircleNeedles(num, scale);
    }

    // Boilerplate

    global.workerEntryPoint_needle = function(message) { return receiveNeedleRequest(message.polygon, message.num, message.scale); }
}
(this));

var isWebWorker = typeof WorkerGlobalScope !== 'undefined';

if (isWebWorker)
{
    self.addEventListener("message", function(e) { self.postMessage(workerEntryPoint_needle(e.data)); }, false);
}
