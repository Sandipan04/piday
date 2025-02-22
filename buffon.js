
// Model

function vec2_t(x, y)
{
    this.x = x;
    this.y = y;
}

function RelativePolygon(sides, angles, extent)
{
    this.sides = sides || [];
    this.angles = angles || [];
    this.extent = extent || 0;
}

var needles = [];
var numHits = 0;

var scale = 0; // global attribute that must be the same for all needles

var presetLine = new RelativePolygon([1], [], 1);
var presetBentV = new RelativePolygon([0.5, 0.5], [1 * Math.PI / 4], 0.5);
var presetBentW = new RelativePolygon([0.25, 0.25, 0.25, 0.25], [1 * Math.PI / 4, 7 * Math.PI / 4, 1 * Math.PI / 4], 2 * Math.sqrt(0.25*0.25*2 * (1 - Math.cos(Math.PI / 4)))); // mmm, law of cosines
var presetTriangle = new RelativePolygon([3/12, 4/12, 5/12], [Math.PI/2, Math.asin(3/5)], 5/12);

var currentPolygon = presetLine;

function resetNeedles()
{
    needles = [];
    numHits = 0;
}

var polygonDrawPoints = [];
var polygonDrawPointCircleRadius = 12;
var epsilon = 0.000000059604644775390625; // 2^-24

// Controller

function sign(value)
{
    if (value === 0)
        return 0;
    else if (value < 0)
        return -1;
    else if (value > 0)
        return 1;

    return NaN;
}


function dist2d(p0, p1)
{
    a = p1.x - p0.x;
    b = p1.y - p0.y;
    return Math.sqrt(a*a + b*b);
}

function getLineIntersection(p0, p1, p2, p3)
{
    var s1 = new vec2_t(p1.x - p0.x, p1.y - p0.y);
    var s2 = new vec2_t(p3.x - p2.x, p3.y - p2.y);

    var s, t;

    s = (-s1.y * (p0.x - p2.x) + s1.x * (p0.y - p2.y)) / (-s2.x * s1.y + s1.x * s2.y);
    t = ( s2.x * (p0.y - p2.y) - s2.y * (p0.x - p2.x)) / (-s2.x * s1.y + s1.x * s2.y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) // Collision detected
        return new vec2_t(p0.x + (t * s1.x), p0.y + (t * s1.y));

    return null; // No collision
}

function arrayIndexWrap(input, arraySize)
{
    while (input < 0)
        input += arraySize;
    while (input >= arraySize)
        input -= arraySize;

    return input;
}

function polygonDrawPointsValidateIntersecting(startpointIndex, point)
{
    var pass = true;

    var mostRecentPoint = polygonDrawPoints.length - 1;

    for (var i = startpointIndex; i < mostRecentPoint - 1 && pass; i++)
        pass = (pass && getLineIntersection(polygonDrawPoints[mostRecentPoint], point, polygonDrawPoints[i], polygonDrawPoints[i+1]) === null);

    return pass;
}

function polygonDrawPointsValidate(point)
{
    var pass = polygonDrawPointsValidateIntersecting(0, point);

    for (var i = 1; i < polygonDrawPoints.length && pass; i++)
        pass = (pass && (point.x !== polygonDrawPoints[i].x || point.y !== polygonDrawPoints[i].y));

    return pass;
}

function polygonDrawPointsAdd(point)
{
    if (polygonDrawPointsValidate(point))
        polygonDrawPoints.push(point);
}

function polygonDrawPointsReset()
{
    polygonDrawPoints = [];
}

function angleBetweenThreePoints(point_prev, point, point_next)
{
    return Math.atan2(point_next.y - point.y, point_next.x - point.x) - Math.atan2(point_prev.y - point.y, point_prev.x - point.x)
}

// View

var buffonMaximumRecommendedNeedles = 100000;

// monotonic clock
window.performance = window.performance || {};
performance.now = (function() {
  return performance.now       ||
         performance.mozNow    ||
         performance.msNow     ||
         performance.oNow      ||
         performance.webkitNow ||
         function() { return new Date().getTime(); };
})();

var appletContainer = document.getElementById('appletContainer');

var appletCanvas = document.getElementById('appletCanvas');
var appletCanvasContext = appletCanvas.getContext('2d');

var upper, lower, fullwidth, height;

function initializeCoordinates()
{
    upper = appletCanvas.height / 3;
    lower = 2 * appletCanvas.height / 3;
    fullwidth = appletCanvas.width;

    height = lower - upper;
}

function drawLineMain(x1, y1, x2, y2)
{
    appletCanvasContext.beginPath();
    appletCanvasContext.lineWidth='4';
    appletCanvasContext.strokeStyle='black';
    appletCanvasContext.moveTo(x1 + .5, y1 + .5);
    appletCanvasContext.lineTo(x2 + .5, y2 + .5);
    appletCanvasContext.stroke();
}

var needleTimeout;

function drawSomeNeedles(needleArray, whenFinished, initialCount)
{
    var endtime = window.performance.now() + 15;

    var numNeedles = needleArray.length;

    for (var i = 0; i < numNeedles; i++)
    {
        if (window.performance.now() > endtime)
        {
            if (initialCount === undefined)
                initialCount = needleArray.length;

            appletCanvasOverlayText.innerHTML = 'Dropping needle ' + ((initialCount - numNeedles) + i + 1) + ' of ' + initialCount + '...';

            var spliced = needleArray.splice(i);
            appletCanvasOverlay.style.backgroundColor = 'rgba(255,255,255,0.667)';
            needleTimeout = setTimeout(function() { drawSomeNeedles(spliced, whenFinished, initialCount); }, 15);

            return;
        }

        var left = height * -needleArray[i].minx;
        var width = fullwidth - left - height * needleArray[i].maxx;

        var currentCoord = new vec2_t(needleArray[i].x, needleArray[i].y);

        appletCanvasContext.beginPath();
        appletCanvasContext.lineWidth='2';
        appletCanvasContext.strokeStyle='hsl(' + (Math.random() * 360) + ',75%,50%)';
        currentCoord.x = left + width * currentCoord.x;
        currentCoord.y = upper + height * currentCoord.y;

        if (currentPolygon !== null)
        {
            appletCanvasContext.moveTo(currentCoord.x + .5, currentCoord.y + .5);

            var numSides = currentPolygon.sides.length;
            var thisAngle = 0;
            for (var j = 0; j < numSides; j++)
            {
                thisAngle += (j === 0 ? needleArray[i].theta : Math.PI - currentPolygon.angles[j-1]) * needleArray[i].handedness;
                var thisSide = height * scale * currentPolygon.sides[j] / currentPolygon.extent;

                currentCoord.x += thisSide * Math.cos(thisAngle);
                currentCoord.y += thisSide * Math.sin(thisAngle);

                appletCanvasContext.lineTo(currentCoord.x + .5, currentCoord.y + .5);
            }
        }
        else
        {
            appletCanvasContext.arc(currentCoord.x + .5, currentCoord.y + .5, height * scale * 0.5, 0, 2*Math.PI);
        }

        appletCanvasContext.stroke();
    }

    appletCanvasOverlayText.innerHTML = '';

    if (whenFinished !== undefined)
        whenFinished();
}

function drawNeedles(needleArray, whenFinished)
{
    clearTimeout(needleTimeout);

    appletCanvasOverlayText.innerHTML = '';

    appletCanvasContext.clearRect(0, 0, appletCanvas.width, appletCanvas.height);

    drawLineMain(0, upper, appletCanvas.width, upper);
    drawLineMain(0, lower, appletCanvas.width, lower);

    if (needleArray === undefined || needleArray === null)
    {
        if (whenFinished !== undefined)
            whenFinished();
        return;
    }

    drawSomeNeedles(needleArray, whenFinished);
}


var buffonNumScale = document.getElementById('buffonNumScale');
var buffonNumExtent = document.getElementById('buffonNumExtent');
var buffonNumDrops = document.getElementById('buffonNumDrops');
var buffonNumHits = document.getElementById('buffonNumHits');
var buffonNumRatio = document.getElementById('buffonNumRatio');
var buffonNumPi = document.getElementById('buffonNumPi');

function updateInfo()
{
    var numDrops = needles.length;
    var extent = currentPolygon !== null ? currentPolygon.extent : 1/Math.PI;

    buffonNumScale.innerHTML = scale;
    buffonNumExtent.innerHTML = 1/extent;
    buffonNumDrops.innerHTML = numDrops;
    buffonNumHits.innerHTML = numHits;
    buffonNumRatio.innerHTML = numHits === 0 ? '0' : numDrops / numHits;
    buffonNumPi.innerHTML = numHits === 0 ? '0' : 2 * scale * numDrops / numHits / extent;
}


var lastNeedles = null;

var appletCanvasOverlay = document.getElementById('appletCanvasOverlay');
var appletCanvasOverlayText = document.getElementById('appletCanvasOverlayText');

function needlesComplete()
{
    appletCanvasOverlay.style.backgroundColor = 'transparent';
    appletCanvasOverlay.style.display = 'none';
}

function updateComplete(result)
{
    lastNeedles = result.needles;

    needles = needles.concat(result.needles);
    numHits += result.numHits;
    updateInfo();

    drawNeedles(lastNeedles, needlesComplete);
};

function masterUpdate(num)
{
    appletCanvasOverlay.style.display = 'block';

    if (scale !== newScale)
        buffonResetForm.onsubmit();

    webworkers.needle.execute({'polygon': currentPolygon, 'num': num, 'scale': scale}, updateComplete);
}
function masterReset()
{
    resetNeedles();
    drawNeedles(null, needlesComplete);
    updateInfo();
}


var scaleScroll = document.getElementById('buffonScaleScroll');
var buffonScaleBox = document.getElementById('buffonScaleBox');


var newScale = scale;


var scrollMin = 0.01;
var scrollMax = 1;

var scrollMaxGap;
var externalScrollingAgent = false;

function updateScaleScroll()
{
    externalScrollingAgent = true;

    scaleScroll.scrollLeft = scaleScroll.scrollWidth;
    scrollMaxGap = scaleScroll.scrollWidth - scaleScroll.scrollLeft;
    scaleScroll.scrollLeft = (newScale - scrollMin) / (scrollMax-scrollMin) * (scaleScroll.scrollWidth - scrollMaxGap);
}

scaleScroll.onscroll = function()
{
    if (externalScrollingAgent) // this is in place to prevent a custom-entered scale from being clobbered by the less precise scrollbar
    {
        externalScrollingAgent = false;
        return;
    }

    newScale = scaleScroll.scrollLeft / (scaleScroll.scrollWidth - scrollMaxGap) * (scrollMax-scrollMin) + scrollMin;

    buffonScaleBox.value = newScale;
};


buffonScaleBox.onblur = function()
{
    var previousScale = newScale;

    newScale = parseFloat(buffonScaleBox.value);

    if (!isNaN(newScale) && newScale > 0 && newScale <= scrollMax)
    {
        updateScaleScroll();
    }
    else
    {
        newScale = previousScale;
    }

    buffonScaleBox.value = newScale;
};

var buffonResetForm = document.getElementById('buffonResetForm');
buffonResetForm.onsubmit = function ()
{
    buffonScaleBox.onblur();
    scale = newScale;
    masterReset();
    return false;
};


var buffonDrop1 = document.getElementById('buffonDrop1');
var buffonDrop10 = document.getElementById('buffonDrop10');
var buffonDrop100 = document.getElementById('buffonDrop100');
var buffonDrop1000 = document.getElementById('buffonDrop1000');
var buffonDropAmountBox = document.getElementById('buffonDropAmountBox');
var buffonDropAmount = document.getElementById('buffonDropAmount');

var buffonDropAmountValue = 1;

function quickDrop(quickDropAmount)
{
    buffonDropAmountValue = quickDropAmount;
    buffonDropAmountBox.value = buffonDropAmountValue;
    masterUpdate(buffonDropAmountValue);
}

buffonDrop1.onclick = function()
{
    quickDrop(1);
};
buffonDrop10.onclick = function()
{
    quickDrop(10);
};
buffonDrop100.onclick = function()
{
    quickDrop(100);
};
buffonDrop1000.onclick = function()
{
    quickDrop(1000);
};

buffonDropAmountBox.onblur = function()
{
    var newValue = parseInt(buffonDropAmountBox.value);

    if (!isNaN(newValue) && newValue > 0)
    {
        buffonDropAmountValue = newValue;
        buffonDropAmountBox.value = newValue;
    }
    else
    {
        buffonDropAmountValue = 0;
        buffonDropAmountBox.value = '';
    }
};

var buffonDropForm = document.getElementById('buffonDropForm');

var exceedRecommendations = false;

buffonDropForm.onsubmit = function ()
{
    buffonDropAmountBox.onblur();
    if (buffonDropAmountValue > 0)
    {
        if (buffonDropAmountValue > buffonMaximumRecommendedNeedles && !exceedRecommendations)
        {
            exceedRecommendations = confirm('Drop amounts above ' + buffonMaximumRecommendedNeedles + ' are not recommended! Are you sure you want to disable this warning and continue?');
            if (!exceedRecommendations)
                return false;
        }

        masterUpdate(buffonDropAmountValue);
    }
    return false;
};



var buffonDropLine = document.getElementById('buffonDropLine');
var buffonDropLineButton = document.getElementById('buffonDropLineButton');
buffonDropLineButton.disabled = false;
var buffonDropBentV = document.getElementById('buffonDropBentV');
var buffonDropBentVButton = document.getElementById('buffonDropBentVButton');
buffonDropBentVButton.disabled = false;
var buffonDropBentW = document.getElementById('buffonDropBentW');
var buffonDropBentWButton = document.getElementById('buffonDropBentWButton');
buffonDropBentWButton.disabled = false;
var buffonDropTriangle = document.getElementById('buffonDropTriangle');
var buffonDropTriangleButton = document.getElementById('buffonDropTriangleButton');
buffonDropTriangleButton.disabled = false;
var buffonDropCircle = document.getElementById('buffonDropCircle');
var buffonDropCircleButton = document.getElementById('buffonDropCircleButton');
buffonDropCircleButton.disabled = false;


buffonDropLine.onsubmit = function()
{
    currentPolygon = presetLine;
    buffonResetForm.onsubmit();

    return false;
}
buffonDropBentV.onsubmit = function()
{
    currentPolygon = presetBentV;
    buffonResetForm.onsubmit();

    return false;
}
buffonDropBentW.onsubmit = function()
{
    currentPolygon = presetBentW;
    buffonResetForm.onsubmit();

    return false;
}
buffonDropTriangle.onsubmit = function()
{
    currentPolygon = presetTriangle;
    buffonResetForm.onsubmit();

    return false;
}
buffonDropCircle.onsubmit = function()
{
    currentPolygon = null;
    buffonResetForm.onsubmit();

    return false;
}


var polygonDrawContainerOpen = false;
var buffonDrawCustom = document.getElementById('buffonDrawCustom');
var buffonDrawCustomButton = document.getElementById('buffonDrawCustomButton');
buffonDrawCustomButton.disabled = false;

function polygonDrawContainerOpenUpdate()
{
    polygonDrawContainer.style.display = polygonDrawContainerOpen ? 'block' : 'none';
}

buffonDrawCustom.onsubmit = function()
{
    polygonDrawContainerOpen = !polygonDrawContainerOpen;
    polygonDrawContainerOpenUpdate();

    return false;
}


var polygonDrawContainer = document.getElementById('polygonDrawContainer');
var polygonDrawCanvas = document.getElementById('polygonDrawCanvas');
var polygonDrawCanvasContext = polygonDrawCanvas.getContext('2d');

var polygonDrawOpen = true;

function drawPolygonDrawCanvas()
{
    polygonDrawCanvasContext.clearRect(0, 0, polygonDrawCanvas.width, polygonDrawCanvas.height);

    if (polygonDrawPoints.length === 0)
        return;

    // draw polygon itself
    polygonDrawCanvasContext.beginPath();
    polygonDrawCanvasContext.lineWidth = '3';
    polygonDrawCanvasContext.strokeStyle = '#000000';
    polygonDrawCanvasContext.moveTo(polygonDrawPoints[0].x + .5, polygonDrawPoints[0].y + .5);
    for (var i = 1; i < polygonDrawPoints.length; i++)
        polygonDrawCanvasContext.lineTo(polygonDrawPoints[i].x + .5, polygonDrawPoints[i].y + .5);
    if (!polygonDrawOpen)
        polygonDrawCanvasContext.closePath();
    polygonDrawCanvasContext.stroke();

    if (polygonDrawOpen)
    {
        // draw circle around first point
        polygonDrawCanvasContext.beginPath();
        polygonDrawCanvasContext.lineWidth = '1';
        polygonDrawCanvasContext.arc(polygonDrawPoints[0].x + .5, polygonDrawPoints[0].y + .5, polygonDrawPointCircleRadius, 0, 2*Math.PI);
        polygonDrawCanvasContext.stroke();
    }
}


function getMousePos(canvas, event)
{
    var rect = canvas.getBoundingClientRect();

    return new vec2_t(event.clientX - rect.left, event.clientY - rect.top);
}

function polygonDrawCanvasMouseDown(event)
{
    if (event.button !== 0)
        return;

    if (!polygonDrawOpen)
        return;

    var mouseDownPos = getMousePos(polygonDrawCanvas, event);

    if (polygonDrawPoints.length > 2 && dist2d(polygonDrawPoints[0], mouseDownPos) < polygonDrawPointCircleRadius)
    {
        if (polygonDrawPointsValidateIntersecting(1, polygonDrawPoints[0]))
        {
            polygonDrawOpen = false;
            drawPolygonDrawCanvas();
        }
    }
    else
    {
        polygonDrawPointsAdd(mouseDownPos);
        drawPolygonDrawCanvas();
    }

    if (polygonDrawPoints.length > 0)
        polygonDrawResetButton.disabled = false;

    if (polygonDrawPoints.length > 1)
        polygonDrawSubmitButton.disabled = false;
}

polygonDrawCanvas.addEventListener("mousedown", polygonDrawCanvasMouseDown, false);


var polygonDrawReset = document.getElementById('polygonDrawReset');
var polygonDrawResetButton = document.getElementById('polygonDrawResetButton');
var polygonDrawSubmit = document.getElementById('polygonDrawSubmit');
var polygonDrawSubmitButton = document.getElementById('polygonDrawSubmitButton');

polygonDrawReset.onsubmit = function()
{
    polygonDrawOpen = true;
    polygonDrawPointsReset();
    polygonDrawSubmitButton.disabled = true;
    polygonDrawResetButton.disabled = true;

    drawPolygonDrawCanvas();

    return false;
}
polygonDrawSubmit.onsubmit = function()
{
    var newPolygon = new RelativePolygon();

    var numPoints = polygonDrawPoints.length;
    var numSides = polygonDrawOpen ? numPoints - 1 : numPoints;
    var sum = 0;

    // get side scales
    for (var i = 0; i < numSides; i++)
    {
        var thisdist = dist2d(polygonDrawPoints[i], polygonDrawPoints[arrayIndexWrap(i+1, numPoints)]);
        newPolygon.sides.push(thisdist);
        sum += thisdist;
    }

    // normalize side scales to 1
    for (var i = 0; i < numSides; i++)
        newPolygon.sides[i] /= sum;

    // get angles
    for (var i = 1; i < numSides; i++)
    {
        var i_minus = arrayIndexWrap(i - 1, numPoints);
        var i_plus = arrayIndexWrap(i + 1, numPoints);

        newPolygon.angles.push(angleBetweenThreePoints(polygonDrawPoints[i_minus], polygonDrawPoints[i], polygonDrawPoints[i_plus]));
    }

    // calculate extent
    for (var i = 0; i < numPoints; i++)
    {
        for (var j = i + 1; j < numPoints; j++)
        {
            var thisdist = dist2d(polygonDrawPoints[i], polygonDrawPoints[j]);
            if (newPolygon.extent < thisdist)
                newPolygon.extent = thisdist;
        }
    }
    newPolygon.extent /= sum;

    // instate our brand new polygon
    currentPolygon = newPolygon;
    buffonResetForm.onsubmit();

    // deal with the drawing canvas
    polygonDrawContainerOpen = false;
    polygonDrawContainerOpenUpdate();
    polygonDrawReset.onsubmit();
    return false;
}


window.onresize = function()
{
    var newWidth = appletContainer.clientWidth;

    updateScaleScroll();

    if (newWidth !== polygonDrawCanvas.width)
    {
        appletCanvas.width = newWidth;
        appletCanvas.height = newWidth * 3 / 4;

        polygonDrawCanvas.width = newWidth;
        polygonDrawCanvas.height = newWidth * 3 / 4;

        initializeCoordinates();
        drawNeedles(lastNeedles, needlesComplete);
        updateInfo();

        drawPolygonDrawCanvas();
    }
}

buffonDropAmountBox.onblur();
buffonResetForm.onsubmit();

window.onresize();