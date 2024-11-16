// Slider
let sliderDiv = d3.select("#slider-container");

let selectionLayout = {
    width: 600,
    height: 100,
    margin: { top: 20, right: 40, bottom: 30, left: 40 }
};

let sliderContainer = sliderDiv.select("svg");

let rangeMin = 0, rangeMax = 0.15; // Initial range

if (sliderContainer.empty()) {
    sliderContainer = slider(selectionLayout, d3)(0.00, 0.15); // Default range 0 to 0.15
    sliderDiv.node().appendChild(sliderContainer);
} else {
    sliderContainer.call(brush.move, [rangeMin, rangeMax].map(frequency));
}

// Slider interaction
sliderContainer.addEventListener("input", function () {
    console.log("Current Value: " + rangeMax + " > " + rangeMin);
    updateChartWithRange(); // Update chart when slider changes
});

// Slider function
function slider(layout, d3) {
    return function (min, max, starting_min = min, starting_max = max) {
        var range = [min, max];
        var starting_range = [starting_min, starting_max];

        var w = layout.width, h = layout.height;
        var margin = layout.margin;
        var width = w - margin.left - margin.right;
        var height = h - margin.top - margin.bottom;

        // var x = d3.scaleLinear().domain(range).range([0, width]);
        var step = 0.005;
        var x = d3.scaleLinear()
            .domain(range)
            .range([0, width]);
        var svgSlide = d3.select("body")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

        const g = svgSlide.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
        g.append('g').selectAll('line')
            .data(d3.range(0, 0.15, step))
            .enter()
            .append('line')
            .attr('x1', d => x(d))
            .attr('x2', d => x(d))
            .attr('y1', 0)
            .attr('y2', height)
            .style('stroke', '#ccc');

        var labelL = g.append("text").attr("id", "labelleft").attr("x", 0).attr("y", height + 20);
        var labelR = g.append("text").attr("id", "labelright").attr("x", 0).attr("y", height + 20);

        var brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on("brush", function () {
                var s = d3.event.selection;
                labelL.attr("x", s[0]).text((x.invert(s[0]).toFixed(2)));
                labelR.attr("x", s[1]).text((x.invert(s[1]).toFixed(2)));

                // Update range values
                rangeMin = x.invert(s[0]);
                rangeMax = x.invert(s[1]);

                handle.transition()
                .duration(20)
                    .attr("display", null).attr("transform", function (d, i) {
                        return "translate(" + [s[i], - height / 4] + ")";
                    });

                svgSlide.node().value = [rangeMin, rangeMax];
                svgSlide.node().dispatchEvent(new CustomEvent("input"));
            });

        var gBrush = g.append("g")
            .attr("class", "brush")
            .call(brush);

        var brushResizePath = function (d) {
            var e = +(d.type == "e"),
                x = e ? 1 : -1,
                y = height / 2;
            return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) +
                "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) +
                "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
        };

        var handle = gBrush.selectAll(".handle--custom")
            .data([{ type: "w" }, { type: "e" }])
            .enter().append("path")
            .attr("class", "handle--custom")
            .attr("stroke", "#000")
            .attr("fill", "#eee")
            .attr("cursor", "ew-resize")
            .attr("d", brushResizePath);

        // override default behaviour - clicking outside of the selected area
        // will select a small piece there rather than deselecting everything
        // https://bl.ocks.org/mbostock/6498000
        gBrush.selectAll(".overlay")
            .each(function (d) { d.type = "selection"; })
            .on("mousedown touchstart", brushcentered)

        function brushcentered() {
            var dx = x(1) - x(0), // Use a fixed width when recentering.
                cx = d3.mouse(this)[0],
                x0 = cx - dx / 2,
                x1 = cx + dx / 2;
            d3.select(this.parentNode).call(brush.move, x1 > width ? [width - dx, width] : x0 < 0 ? [0, dx] : [x0, x1]);
        }

        // select entire range
        gBrush.call(brush.move, [x(0), x(0.15)]);
        return svgSlide.node();
    }
};

// Function to update the chart based on slider range
function updateChartWithRange() {
    // Re-render the chart with the new min/max range values from the slider
    updateChart(document.getElementById('categorySelect').value);
}

// Global function called when select element is changed
function onCategoryChanged() {
    var select = d3.select('#categorySelect').node();
    // Get current value of select element
    var category = select.options[select.selectedIndex].value;
    // Update chart with the selected category of letters
    updateChart(category);
}

// recall that when data is loaded into memory, numbers are loaded as strings
// this function helps convert numbers into string during data preprocessing
function dataPreprocessor(row) {
    return {
        letter: row.letter,
        frequency: +row.frequency
    };
}

var svg = d3.select('svg');

// Get layout parameters
var svgWidth = +svg.attr('width');
var svgHeight = +svg.attr('height');

var padding = { t: 60, r: 40, b: 30, l: 40 };

// Compute chart dimensions
var chartWidth = svgWidth - padding.l - padding.r;
var chartHeight = svgHeight - padding.t - padding.b;

// Compute the spacing for bar bands based on all 26 letters
var barBand = chartHeight / 26;
var barHeight = barBand * 0.7;

// Create a group element for appending chart elements
var chartG = svg.append('g')
    .attr('transform', 'translate(' + [padding.l, padding.t] + ')');

// A map with arrays for each category of letter sets
var lettersMap = {
    'all-letters': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    'only-consonants': 'BCDFGHJKLMNPQRSTVWXZ'.split(''),
    'only-vowels': 'AEIOUY'.split('')
};

// 1. Load and reformat data
d3.csv('letter_freq.csv', dataPreprocessor).then(function (dataset) {
    // 2. Create global variables here and intialize the chart
    letters = dataset;  // do not set it as var/let/const

    // **** Your JavaScript code goes here ****

    // Update the chart for all letters to initialize
    updateChart('all-letters');
});


function updateChart(filterKey) {
    // Create a filtered array of letters based on the filterKey
    var filteredLetters = letters.filter(function (d) {
        return lettersMap[filterKey].indexOf(d.letter) >= 0;
    }).filter(function (d) {
        return d.frequency >= rangeMin && d.frequency <= rangeMax; // Apply the slider filter
    });

    // **** Draw and Update your chart here ****
    // Initialize the plots by removing previous elements
    chartG.selectAll('.bar, .x-axis, .title').remove();
    svg.selectAll('.y-axis').remove();

    // 3. Set Scales
    const xFreq = d3.scaleLinear()
        .domain([0, d3.max(letters, d => d.frequency)])
        .range([0, chartWidth]);

    const yLetter = d3.scaleBand()
        .domain(filteredLetters.map(d => d.letter))
        .range([0, filteredLetters.length * barBand]);

    // 4. Plot data
    // Select all elements with the class 'bar' (which will be empty initially)
    let bars = chartG.selectAll('.bar')
        .data(filteredLetters, d => d.letter);

    // Enter
    let barsEnter = bars.enter()
        .append('g')
        .attr('class', 'bar')
        .attr('transform', function (d, i) {
            return 'translate(' + [0, i * barBand + 4] + ')';
        });

    barsEnter.append('rect')
        .attr('height', barHeight)
        .attr('width', 0);

    // Merge enter and update selections
    bars = barsEnter.merge(bars);

    // Update
    bars.transition()
        .duration(500)
        .select('rect')
        .attr('width', function (d) {
            return xFreq(d.frequency);
        });

    // 5. Add axes
    var xAxisBottom = d3.axisBottom(xFreq).ticks(6).tickFormat(d => d * 100 + "%");
    var xAxisTop = d3.axisTop(xFreq).ticks(6).tickFormat(d => d * 100 + "%");

    // Add bottom x-axis
    chartG.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxisBottom);

    // Add top x-axis
    chartG.append('g')
        .attr('class', 'x-axis')
        .call(xAxisTop);

    // Add y-axis
    var yAxis = d3.axisLeft(yLetter).tickSize(0);

    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', 'translate(' + [padding.l, padding.t] + ')')
        .call(yAxis)
        .select('.domain')
        .remove()
        .selectAll(".tick text")
        .transition()
        .duration(500);

    // 6. Add Title and Label
    chartG.append("text")
        .attr("class", "title")
        .attr("x", chartWidth / 2)
        .attr("y", -chartHeight / 20)
        .attr("text-anchor", "middle")
        .text("Letter Frequency (%)");
}

// Remember code outside of the data callback function will run before the data loads