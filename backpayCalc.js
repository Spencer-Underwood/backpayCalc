/*  backpayCalc.js
 *  Inspired from and heavily modified from ardew nordlands code.
 *	To-do:
 *		* Fix anniversary problem								- Fixed
 *		* Deal with anniversary dates == contract dates						- Done
 *		* OT not showing up in the right pay period						- Fixed.
 *		* Make sure promotions, actings, overtimes, lwops, and lump sums use querySelectorAll	- Done....I think
 *		* Contractual increases not taking place during acting periods				- Done
 *		* Anniversaries not being honoured during actings/lwops.				- Done
 *		* Start after beginning of contract
 *		* Being on acting at beginning of contract
 *		* Being on lwop at beginning of contract
 *
 */

import { data } from './raiseInfo.js';
import { i18n } from './i18n.js';

// #region variables
// Global configuration variables
var dbug = true;
let lang = "en";
var langFormat = "en-CA";
var version = "3.0";
var updateHash = true;
var saveValues = null;
var showExtraCols = true;

const WeeksInYear = 52.176;

// I'm hoping this singleton makes it
// const appData = (function() {
//     let lang = null;
// 	let group = null;
//     let classification = null;
//     let CA = null;
// 	let level = -1;
// 	let step = -1;
//
//     return { /* API calls */
//         // Getters
// 		getLang: function() { return lang },
//         getGroup: function() { return group; },
//         getClassification: function() { return classification; },
//         getCA: function() { return CA;},
// 		getLevel: function() { return level;},
// 		getStep: function() { return step;},
// 		getWeeksInYear: function() {return 52.176;},
//         // Setters
// 		setLang: function(newlang) { lang = newlang },
//         setGroup: function(newGroup) { group = newGroup; },
//         setClassification: function(newClassification) { classification = newClassification; },
//         setCA: function(newCA) { CA = newCA; },
// 		setLevel: function(newLevel) { level = newLevel; },
// 		setStep: function(newStep) { step = newStep; },
//     };
// })();

// Collective Agreement variables
let group = null;
let classification = null;
let chosenCA = null;
let level = -1;
let step = -1;

// Helper function to skip directly to CA when group / class / CA are defined.
data.chosenCA = function() {
    return this[group][classification][chosenCA];
};

//let levelSel = document.getElementById("levelSelect");
//var stepSel = document.getElementById("stepSelect");
// Form elements
var mainForm = document.getElementById("mainForm");
var lastModTime = document.getElementById("lastModTime");
var startDateTxt = document.getElementById("startDateTxt");
var resultStatus = document.getElementById("resultStatus");
var calcStartDate = document.getElementById("calcStartDate");
var endDateTxt = document.getElementById("endDateTxt");
// Buttons
// var addPromotionBtn = document.getElementById("addPromotionBtn");
// var addActingBtn = document.getElementById("addActingBtn");
// var addOvertimeBtn = document.getElementById("addOvertimeBtn");
// var addLwopBtn = document.getElementById("addLwopBtn");
// var addLumpSumBtn = document.getElementById("addLumpSumBtn");
// Result elements
var resultsDiv = document.getElementById("resultsDiv");
var resultsBody = document.getElementById("resultsBody");
var resultsFoot = document.getElementById("resultsFoot");
var resultsTheadTR = document.getElementById("resultsTheadTR");
// Maths Stuff ?
var numPromotions = null;
var startingSalary = 0;
var TABegin = new Date("2021", "11", "22");		// Remember months:  0 == Janaury, 1 == Feb, etc.
var EndDate = new Date("2024", "02", "17");		// This is the day after this should stop calculating; same as endDateTxt.value in the HTML
var day = (1000 * 60 * 60 * 24);
var parts = [];
var periods = [];
var initPeriods = [];
var lumpSumPeriods = {};
var overtimePeriods = {};
//var promotions = 0;
var actings = 0;
var lumpSums = 0;
var overtimes = 0;
var lwops = 0;
var lastModified = new Date("2023", "09", "22");

//var salaries = [];
var daily = [];
var hourly = [];
var newRates = {};


// taken from http://www.tbs-sct.gc.ca/agreements-conventions/view-visualiser-eng.aspx?id=1#toc377133772
/*
var salaries = [
	[56907, 59011, 61111, 63200, 65288, 67375, 69461, 73333],
	[70439, 72694, 74947, 77199, 79455, 81706, 83960, 86213],
	[83147, 86010, 88874, 91740, 94602, 97462, 100325, 103304],
	[95201, 98485, 101766, 105050, 108331, 111613, 114896, 118499],
	[108528, 112574, 116618, 120665, 124712, 128759, 132807, 136852, 141426]

];
var daily = [
	[218.13, 226.20, 234.25, 242.26, 250.26, 258.26, 266.26, 281.10],
	[270.01, 278.65, 287.29, 295.92, 304.57, 313.19, 321.83, 330.47],
	[318.72, 329.69, 340.67, 351.66, 362.63, 373.59, 384.56, 395.98],
	[364.92, 377.51, 390.09, 402.68, 415.25, 427.83, 440.42, 454.23],
	[416.01, 431.52, 447.02, 462.53, 478.04, 493.56, 509.07, 524.58, 542.11]
];
var hourly = [
	[29.08, 30.16, 31.23, 32.30, 33.37, 34.43, 35.50, 37.48],
	[36.00, 37.15, 38.30, 39.46, 40.61, 41.76, 42.91, 44.06],
	[42.50, 43.96, 45.42, 46.89, 48.35, 49.81, 51.28, 52.80],
	[48.66, 50.33, 52.01, 53.69, 55.37, 57.04, 58.72, 60.56],
	[55.47, 57.54, 59.60, 61.67, 63.74, 65.81, 67.88, 69.94, 72.28]
];
*/
//var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
//var days = [31, 29, 31

// #endregion variables
function oldinit () {
	if (dbug) console.log ("Initting");
	//saveValues = new Map();
	var calcBtn = document.getElementById("calcBtn");
	let levelSel = document.getElementById("levelSelect");
	//if (updateHash) levelSel.addEventListener("change", saveValue, false);
	let stepSel = document.getElementById("stepSel");
	//if (updateHash) stepSel.addEventListener("change", saveValue, false);
	resultsDiv = document.getElementById("resultsDiv");
	startDateTxt = document.getElementById("startDateTxt");
	//if (updateHash) startDateTxt.addEventListener("change", saveValue, false);
	endDateTxt = document.getElementById("endDateTxt");
	//if (updateHash) startDateTxt.addEventListener("change", saveValue, false);
	calcStartDate = document.getElementById("calcStartDate");
	addPromotionBtn = document.getElementById("addPromotionBtn");
	addActingBtn = document.getElementById("addActingBtn");
	addOvertimeBtn = document.getElementById("addOvertimeBtn");
	addLwopBtn = document.getElementById("addLwopBtn");
	addLumpSumBtn = document.getElementById("addLumpSumBtn");
	resultsBody = document.getElementById("resultsBody");
	resultsFoot = document.getElementById("resultsFoot");
	resultsTheadTR = document.getElementById("resultsTheadTR");
	resultStatus = document.getElementById("resultStatus");
	lastModTime = document.getElementById("lastModTime");

	if (lastModTime) {
		lastModTime.setAttribute("datetime", lastModified.toISOString().substr(0,10));
		lastModTime.innerHTML = lastModified.toLocaleString("en-CA", { year: 'numeric', month: 'long', day: 'numeric' });
	}
	if (dbug || showExtraCols) {
		var ths = resultsTheadTR.getElementsByTagName("th");
		if (ths.length == 4) {
			createHTMLElement("th", {"parentNode":resultsTheadTR, "scope":"col", "textNode":"Level"});
			createHTMLElement("th", {"parentNode":resultsTheadTR, "scope":"col", "textNode":"Step"});
			createHTMLElement("th", {"parentNode":resultsTheadTR, "scope":"col", "textNode":"There?"});
			createHTMLElement("th", {"parentNode":resultsTheadTR, "scope":"col", "textNode":"Salary"});
			createHTMLElement("th", {"parentNode":resultsTheadTR, "scope":"col", "textNode":"Working Days"});
		}
	}
	/*for (var r in results) {
		results[r] = document.getElementById(r);
	}*/
	if (dbug) console.log("init::MainForm is " + mainForm + ".");
	if (levelSel && stepSel && mainForm && startDateTxt && calcBtn && addActingBtn && addPromotionBtn) {
		if (dbug) console.log ("Adding change event to calcBtn.");
		levelSel.addEventListener("change", populateSalary, false);
		if (levelSel.value.match(/[1-5]/)) populateSalary();
		startDateTxt.addEventListener("change", selectSalary, false);
		if (startDateTxt.value.replace(/[^-\d]/, "").match(/YYYY-MM-DD/)) populateSalary();

		// calcBtn.addEventListener("click", startProcess, false);
		// addActingBtn.addEventListener("click", addActingHandler, false);
		// addLwopBtn.addEventListener("click", addLWoPHandler, false);
		// addOvertimeBtn.addEventListener("click", addOvertimeHandler, false);
		// addLumpSumBtn.addEventListener("click", addLumpSumHandler, false);
		// addPromotionBtn.addEventListener("click", addPromotionHandler, false);
	} else {
		if (dbug) console.error ("Couldn't get levelSelect.");
	}
	handleHash ();
} // End of oldinit

function populateGroupSelect (bookmarkGroup = null) {
	// This *should* only ever run once
	let groupSel = document.getElementById("groupSelect");
	for (const group in data) {
		let attributes = { "parentNode": groupSel, "textNode": group, "value": group};
		if (group === bookmarkGroup) { attributes["selected"] = true; } // Add something for the bookmarks
		createHTMLElement("option", attributes);
	}
} // End of populateGroupSelect

function populateClassificationSelect (bookmarkClassification = null) {
	// When this function is invoked, clear out the dropdown and populate it with the new options.
	let classSel = document.getElementById("classificationSelect");
	classSel.length = 1;
	for (const classifications in data[group]) {
		let attributes = { "parentNode": classSel, "textNode": classifications};
		if (bookmarkClassification === classifications) { attributes["selected"] = true; }
		createHTMLElement("option", attributes);
	}
	// If there's exactly one classification, select it and skip to the CA selector
	if ( Object.keys(data[group]).length === 1) {
		classSel.selectedIndex = 1;
		classification=classSel.value;
		populateCASelect();
	}
} // End of populateClassificationSelect

function populateCASelect(bookmarkCA = null) {
	// Delete all options and create new options every time  this is invoked.
	let CASel = document.getElementById("CASelect");
	CASel.length = 1;
	for (const CA in data[group][classification]) {
		let attributes = { "parentNode": CASel, "textNode": CA};
		if (CA === bookmarkCA) { attributes["selected"] = true; }
		createHTMLElement("option", attributes);
	}
} // End of populateCASelect

function populateLevelSelect(bookmarkLevel = null){
	let levelSel = document.getElementById("levelSelect");
	levelSel.length = 1;
    for (let i = 0; i < data.chosenCA().levels; i++) {
		let attributes = {"parentNode": levelSel, "textNode": `${classification}-${i + 1}`, "value": i};
		if (i === bookmarkLevel) { attributes["selected"] = true; }
		createHTMLElement("option", attributes);
    }
} // End of populateLevelSelect

function populateStepSelect(bookmarkStep = null){
	let stepSel = document.getElementById("stepSelect");
	let steps =  data.chosenCA().salaries[level];

	for (let i = 0; i < steps.length; i++) {
		let attributes = {"parentNode": stepSel, "textNode": `Step ${i+1} - ${ getNum(steps[i]) }`, "value": i};
		if (i === bookmarkStep) { attributes["selected"] = true; }
		createHTMLElement("option", attributes);
    }
} // End of populateStepSelect

// Only a convenience function for the group / level / etc selectors. Do not use elsewhere, won't work as expected!
function resetSelectors(selector){
	console.debug(`Resetting selectors on: ${selector}`)
	const classSel = document.getElementById("classificationSelect");
	const CASel = document.getElementById("CASelect");
	const levelSel = document.getElementById("levelSelect");
	const stepSel = document.getElementById("stepSelect");

	switch (selector) {
		case "groupSel" :
			classSel.length = 1;
			classSel.selectedIndex = 0;
			/* falls through */
		case "classSel" :
			CASel.selectedIndex = 0;
			CASel.length = 1;
			/* falls through */
		case "CASel" :
			levelSel.selectedIndex = 0;
			levelSel.length = 1;
			/* falls through */
		case "levelSel" :
			stepSel.selectedIndex = 0;
			stepSel.length = 1;
			/* falls through */
		case "stepSel" :
			break;
	}
}

function getStr (str) {
	let rv = null;
	try {
		rv = i18n[str][lang];
		let repStr = null;
		// Not confident in this part, commenting out for now - SLU
		// while (repStr = rv.match(/(\{\{(.*?)\}\})/)) {
		// 	if (repStr) {
		// 		if (repStr[2] == "startDate") {
		// 			rv = rv.replace(repStr[1], calcStartDate.getAttribute("datetime"));
		// 		} else if (repStr[2] == "endDate") {
		// 			rv = rv.replace(repStr[1], EndDate.toISOString().substr(0,10));
		// 		} else if (repStr[2] == "knownEndDate") {
		// 			rv = rv.replace(repStr[1], knownEndDate);
		// 		}
		// 	}
		// }
	}
	catch (ex) {
		console.error ("Error getting Error Message String: " + ex.message + "(" + str + ")");
	}
	return rv;
} // End of getStr

function generateAllRates() {
	// Actual calculations start about 25-30 lines down
	const calculateSalaryBreakdown = (annual) => ({
		annual: annual,
		weekly: annual / WeeksInYear,
		daily: annual / WeeksInYear / 5,
		hourly: annual / WeeksInYear / 5 / 7.5
	});

	// Since groups, classifications, and CA are objects and not arrays they can't be iterated over directly
	for (const groupKey in data) {
		for (const classificationKey in data[groupKey]) {
			for (const CAKey in data[groupKey][classificationKey]) {
				console.debug("Processing rates for:", groupKey, classificationKey, CAKey );
				const CA = data[groupKey][classificationKey][CAKey];
				let salaries = CA.salaries;
				let levels = salaries.length;
				CA.levels =  levels;

				let rates = { current: {salary: []} };

				// -- *Actually* calculate the rates starting here
				// Create the starting array based on the unmodified salary dollars in the JSON file
				for (let level = 0; level < levels; level++) {
					let steps = [];
					for (let step = 0; step < salaries[level].length; step++) {
						steps.push(calculateSalaryBreakdown(salaries[level][step]));
					}
					rates.current.salary.push(steps);
				}

				// Deep copy of the current salary to avoid accidental modification
				let previousSalary = JSON.parse(JSON.stringify(rates.current.salary));
				let previousCompounded = Array(levels).fill(0);

				const payPeriods = CA.periods.filter(period => period.type === "Contractual Increase")
											  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

				// Calculate each pay period by multiplying its increment against the previous period.
				for (let i = 0; i < payPeriods.length; i++) {
					let period = payPeriods[i];
					rates[period.date] = { salary: [] };

					// If only one increment, apply it to all levels
					if (period.increments.length === 1) {
						period.increments = Array(levels).fill(period.increments[0]);
					}

					for (let level = 0; level < period.increments.length; level++) {
						let incrementValue = Number(period.increments[level]);
						let steps = [];
						for (let step = 0; step < previousSalary[level].length; step++) {
							let annual = previousSalary[level][step].annual * (1 + incrementValue / 100);
							steps.push(calculateSalaryBreakdown(annual));
						}
						rates[period.date].salary.push(steps);
					}
					rates[period.date].increments = period.increments;
					rates[period.date].compounded = previousCompounded.map((prev, idx) => ((1 + prev / 100) * (1 + period.increments[idx] / 100) - 1) * 100);

					// Update "previous" variables for the next iteration
					previousSalary = JSON.parse(JSON.stringify(rates[period.date].salary));
					previousCompounded = [...rates[period.date].compounded];
				}
				// Finally, after all calculations are done slap this bad boy into it's CA
				CA.rates = rates;
			}
		}
	}
} // End of generateAllRates

function generateTables(CA) {
    // TODO: handle options or parameters or whatnot
	let levels = CA.levels;
	let rates = CA.rates;
	let timeps = ["annual", "weekly", "daily", "hourly"];
	let payTablesSection = document.getElementById("payTablesSection");

    // Create tables for each level
    for (let level = 0; level < levels; level++) {
        let levelText = `${classification}-${level + 1}`;
        let newSection = createHTMLElement("details", { parentNode: payTablesSection, id: `payrateSect${level}` });
        let newSummary = createHTMLElement("summary", { parentNode: newSection });
        createHTMLElement("h3", { parentNode: newSummary, textNode: levelText });

        let yearSect = createHTMLElement("section", { parentNode: newSection, class: "yearSect" });
        createHTMLElement("h4", { parentNode: yearSect, textNode: `${getStr("current")} (${CA.startDate.slice(0, 10)})` });
        let respDiv = createHTMLElement("div", { parentNode: yearSect, class: "tables-responsive" });

        let newTable = createHTMLElement("table", { parentNode: respDiv, class: "table caption-top" });
        let newTHead = createHTMLElement("thead", { parentNode: newTable });
        let newTR = createHTMLElement("tr", { parentNode: newTHead });

        // Create table headers for steps
        createHTMLElement("td", { parentNode: newTR, textNode: "" });
        for (let step = 0; step < rates["current"].salary[level].length; step++) {
            createHTMLElement("th", { parentNode: newTR, textNode: `${getStr("step")} ${step + 1}`, scope: "col" });
        }

        // Create table body for current salary values
        let newTBody = createHTMLElement("tbody", { parentNode: newTable });
        timeps.forEach(t => {
            let row = createHTMLElement("tr", { parentNode: newTBody });
            createHTMLElement("th", { parentNode: row, textNode: getStr(t), scope: "row" });
            for (let step = 0; step < rates["current"].salary[level].length; step++) {
                createHTMLElement("td", { parentNode: row, textNode: getNum(rates["current"].salary[level][step][t]) });
            }
        });

        // Iterate over pay periods in the payPeriods object, skipping 'current'
		// TODO: Add a row for
        for (let period in rates) {
            if (period === "current") continue;

            let payPeriod = rates[period];

            let newYearSect = createHTMLElement("section", { parentNode: newSection, class: "yearSect" });
            createHTMLElement("h4", { parentNode: newYearSect, textNode: period });
            let respDiv = createHTMLElement("div", { parentNode: newYearSect, class: "tables-responsive" });

            let newTable = createHTMLElement("table", { parentNode: respDiv, class: "table caption-top" });
            let newTHead = createHTMLElement("thead", { parentNode: newTable });
            let newTR = createHTMLElement("tr", { parentNode: newTHead });

            createHTMLElement("td", { parentNode: newTR, textNode: "" });
            for (let step = 0; step < payPeriod.salary[level].length; step++) {
                createHTMLElement("th", { parentNode: newTR, textNode: `${getStr("step")} ${step + 1}`, scope: "col" });
            } 

            let newTBody = createHTMLElement("tbody", { parentNode: newTable });
            timeps.forEach(t => {
                let row = createHTMLElement("tr", { parentNode: newTBody });
                createHTMLElement("th", { parentNode: row, textNode: getStr(t), scope: "row" });
                for (let step = 0; step < payPeriod.salary[level].length; step++) {
                    createHTMLElement("td", { parentNode: row, textNode: getNum(payPeriod.salary[level][step][t]) });
                }
            });

			// TODO: Add inflation / CPI stuff to the info section here
			let infoSect = createHTMLElement("section", {"parentNode" : newYearSect/*, "insertBefore" : respDiv*/});
			createHTMLElement("h5", {"parentNode" : infoSect, "textNode" : getStr("info")});
			let infoDL = createHTMLElement("dl", {"parentNode" : infoSect});
			createHTMLElement("dt", {"parentNode":infoDL, "textNode" : getStr("payrateIncr")});
			createHTMLElement("dd", {"parentNode":infoDL, "textNode" : payPeriod.increments[level]+ " %"});
			createHTMLElement("dt", {"parentNode":infoDL, "textNode" : getStr("payrateTotalIncr")});
			createHTMLElement("dd", {"parentNode":infoDL, "textNode" : payPeriod.compounded[level] + " %"});
        }
    }
	console.info("Generated tables for:", CA);
} // End of generateTables

function getNum(num) {
	// These options are needed to round to whole numbers if that's what you want.
	//minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
	//maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
	// Taken from https://stackoverflow.com/questions/149055/how-to-format-numbers-as-currency-string
	const formatter = new Intl.NumberFormat(langFormat, {style: 'currency', currency: 'CAD',});
	let showPrecise = false;
	let calcRounded = false;
	if (showPrecise) {
		if (calcRounded) {
			return formatter.format(num);
		} else {
			return num;
		}
	} else {
		return formatter.format(num);
	}
} // End of getNum

// Check the document location for saved things
function handleHash () {
	let hasHash = false;
	let thisURL = new URL(document.location);
	let params = thisURL.searchParams;

	//let hash = thisURL.hash;
	let toCalculate = 0;
	if (params.has("dbug")) {
		if (params.get("dbug") == "true") dbug= true;
	}

	if (params.has("lvl")) {
		let lvl = params.get("lvl").replace(/\D/g, "");
		levelSel.selectedIndex = lvl;
		toCalculate = toCalculate + 1;
		populateSalary();
		hasHash = true;
	}
	if (params.has("strtdt")) {
		let sd = params.get("strtdt");
		if (sd.match(/\d\d\d\d-\d\d-\d\d/)) {
			startDateTxt.value = sd;
			toCalculate = toCalculate | 2;
		}
		hasHash = true;
	}
	if (params.has("stp")) {
		let stp = params.get("stp").replace(/\D/g, "");
		stepSel.selectedIndex = stp;
		toCalculate = toCalculate | 4;
		hasHash = true;
	}
	/*
	setTimeout (function () {
		console.log ("Gonna try and set step now");
		if (params.get("stp")) {
			let stp = params.get("stp").replace(/\D/g, "");
			console.log ("And gonna set it now to " + stp + ".");
			stepSel.selectedIndex = stp;
			toCalculate = toCalculate | 4;
		}}, 0);
	*/
	if (params.get("enddt")) {
		let ed = params.get("enddt");
		if (ed.match(/\d\d\d\d-\d\d-\d\d/)) {
			endDateTxt.value = ed;
			toCalculate = toCalculate | 8;
		}
		hasHash = true;
	}
	
	// Promotions
	let looking = true;
	for (let i = 0; i<5 && looking; i++) {
		if (params.has("pdate" + i) && params.has("plvl"+i)) {
			addPromotionHandler(null, {"date" : params.get("pdate" + i), "level" : params.get("plvl" + i), "toFocus" : false});
			hasHash = true;
		} else {
			looking = false;
		}
	}

	// Actings
	looking = true;
	let acl = 0;
	while (looking) {
		// afrom0=2020-01-05&ato0=2020-02-06&alvl0=3&afrom1=2020-04-04&ato1=2020-05-06&alvl1=3
		if (params.has("afrom" + acl) || params.has("ato"+acl) || params.has("alvl"+acl)) {
			if (params.has("afrom" + acl) && params.has("ato"+acl) && params.has("alvl"+acl)) {
				addActingHandler(null, {"from" : params.get("afrom" + acl), "to" : params.get("ato" + acl), "level" : params.get("alvl" + acl), "toFocus" : false});
				hasHash = true;
			}
		} else {
			looking = false;
		}
		acl++;
	}

	// LWoPs
	looking = true;
	let ls = 0;
	while (looking) {
		if (params.has("lfrom" + ls) || params.has("lto"+ls)) {
			if (params.has("lfrom" + ls) && params.has("lto"+ls)) {
				addLWoPHandler(null, {"from" : params.get("lfrom" + ls), "to" : params.get("lto" + ls), "toFocus" : false});
				hasHash = true;
			}
		} else {
			looking = false;
		}
		ls++;
	}

	// Overtimes/Standbys
	looking = true;
	let ots = 0;
	while (looking) {
		if (params.has("otdate" + ots) || params.has("otamt"+ots) || params.has("otrt"+ots)) {
			if (params.has("otdate" + ots) && params.has("otamt"+ots) && params.has("otrt"+ots)) {
				addOvertimeHandler(null, {"date" : params.get("otdate" + ots), "hours" : params.get("otamt" + ots), "rate" : params.get("otrt" + ots), "toFocus" : false});
				hasHash = true;
			}
		} else {
			looking = false;
		}
		ots++;
	}

	// Lump Sum Payments
	looking = true;
	let lss = 0;
	while (looking) {
		if (params.has("lsdate" + lss) || params.has("lsamt"+lss) || params.has("lsrt"+lss)) {
			if (params.has("lsdate" + lss) && params.has("lsamt"+lss)) {
				addLumpSumHandler(null, {"date" : params.get("lsdate" + lss), "hours" : params.get("lsamt" + lss), "toFocus" : false});
				hasHash = true;
			}
		} else {
			looking = false;
		}
		lss++;
	}

	if (dbug) console.log ("toCalculate: " + toCalculate + ": " + toCalculate.toString(2) + ".");
	if (hasHash) {
		//calcBtn.focus();
		let clickEv = new Event("click");
		calcBtn.dispatchEvent(clickEv);

	}


} // End of handleHash

function saveValue (e) {
	let ot = e.originalTarget;
	let key = ot.id;
	let value = (ot.toString().match(/HTMLSelect/) ? ot.selectedIndex : ot.value);
	//saveValues[key] = value;
	//saveValues.set(key, value);

	

	if (updateHash) setURL();
} // End of saveValue

// set the URL
function setURL () {
	let url = new URL(document.location);
	let newURL = url.toString().replace(/#.*$/, "");
	newURL = newURL.replace(/\?.*$/, "");
	//let params = [];
	/*for (let id in filters) {
		if (!filters[id].checked) {
			params.push(id.replace("Chk", ""));
			if (id.match(/levelA/)) {
				params[params.length-1] += "$";
			}
		}
	}*/
	/*
	if (levelSel) saveValues["lvl"] = levelSel.selectedIndex);
	if (startDateTxt.value) ("strtdt=" +  startDateTxt.value);
	if (stepSel) params.push("stp=" +  stepSel.selectedIndex);
	if (endDateTxt.value) params.push("enddt=" +  endDateTxt.value);

	newURL += "?" + params.join("&");
	*/
	newURL += "?";
	/*saveValues.forEach(function (val, key, saveValues) {
		console.log ("adding " + key + "=" + val);
		newURL += key + "=" + val + "&";
		});
	newURL = newURL.substring(0, newURL.length - 1);
	*/
	newURL += saveValues.join("&");
	/*
	if (params.length > 0) {
		newURL += "?filters=" + params.join(sep) + (selectedTab != "" ? "&" + selectedTab : "") + url.hash;
	} else {
		newURL += (selectedTab != "" ? "?" + selectedTab : "") + url.hash;
	}
	*/
	history.pushState({}, document.title, newURL);
	

} // End of setURL




/*
   Populates the Salary Select basedon the CS-0x level selected
*/
function populateSalary () {
	removeChildren(stepSel);
	if (levelSel.value >0 && levelSel.value <= 5) {
		createHTMLElement("option", {"parentNode":stepSel, "value":"-1", "textNode":"Select Salary"});
		for (var i = 0; i < salaries[(levelSel.value-1)].length; i++) {
			createHTMLElement("option", {"parentNode":stepSel, "value":i, "textNode":"$" + salaries[levelSel.value-1][i].toLocaleString()});
		}
	}
	if (startDateTxt.value.replace(/[^-\d]/, "").match(/(\d\d\d\d)-(\d\d)-(\d\d)/)) selectSalary();
} // End of populateSalary

// Once a CS-level and startDate have been selected, select the most likely salary from the dropdown
// Called from init when startDateTxt has changed, and from populateSalary if startDateTxt is a date (####-##-##)

// I don't get it.  What's the difference btween selectSalary and getSalary?
// They both start the same way: get the startDateText date, check for leapyear, set the startDateTxt value, figure out your step, select the step
function selectSalary () {
	//if (!(levelSelect.value > 0 && levelSelect.value <= 5))
	if (parts && levelSel.value >0 && levelSel.value <= 5) {	// if you have a start date, and a CS-0x level
		let startDate = getStartDate();
		startDateTxt.value = startDate.toISOString().substr(0,10)
		let timeDiff = (TABegin - startDate) / day;
		let years = Math.floor(timeDiff/365);

		if (dbug) console.log ("TimeDiff between " + TABegin.toString() + " and " + startDate.toString() + ": "  + timeDiff + ".");

		if (timeDiff < 0) {
			// You started after the CA started
			calcStartDate.setAttribute("datetime", startDate.toISOString().substr(0,10));
			calcStartDate.innerHTML = startDate.toLocaleString("en-CA", { year: 'numeric', month: 'long', day: 'numeric' });

			step = 1;
		} else {
			// You started after the CA started
			calcStartDate.setAttribute("datetime", TABegin.toISOString().substr(0,10));
			calcStartDate.innerHTML = TABegin.toLocaleString("en-CA", { year: 'numeric', month: 'long', day: 'numeric' });

			var step = Math.ceil(years, salaries[levelSel.value].length-1) + 1;
		}
		if (dbug) console.log ("Your step would be " + step + ".");
		if (step > salaries[levelSel.value].length) step = salaries[levelSel.value].length;
		if (dbug) console.log ("But there ain't that many steps.  so you're step " + step +".");

		stepSel.selectedIndex=step;
		//step = Math.min(years, salaries[levelSel.value].length);

		/*
		var opts = stepSel.getElementsByTagName("option");
		for (var i = 0; i < opts.length; i++) {
			if (opts[i].hasAttribute("selected")) opts[i].removeAttribute("selected");
			if (i == step) opts[i].setAttribute("selected", "selected");
		}
		*/

	}
} // End of selectSalary

function getStartDate () {
	let dparts = null;
	startDateTxt.value = startDateTxt.value.replace(/[^-\d]/, "");
	dparts = startDateTxt.value.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
	if (dbug) console.log ("Got startDateTxt " + startDateTxt.value + ".");
	if (dbug) console.log ("Got dparts " + dparts + ".");
	// Leap years
	if (dparts[2] == "02" && dparts[3] > "28") {
		if (parseInt(dparts[1]) % 4 === 0 && dparts[3] == "29") {
			// Do nothing right now
		} else {
			dparts[3]=(parseInt(dparts[1]) % 4 === 0? "29" : "28");
		}
	}
	return new Date(dparts[1], dparts[2]-1, dparts[3]);

} // End of getStartDate

function startProcess () {
	resetPeriods();
	saveValues = [];
	lumpSumPeriods = {};
	overtimePeriods = {};
	if (resultsBody) {
		removeChildren (resultsBody);
	} else {
		var resultsTable = document.getElementById("resultsTable");
		resultsBody = createHTMLElement("tbody", {"parentNode":resultsTable, "id":"resultsBody"});
	}
	if (resultsFoot) {
		removeChildren (resultsFoot);
	} else {
		var resultsTable = document.getElementById("resultsTable");
		resultsFoot = createHTMLElement("tfoot", {"parentNode":resultsTable, "id":"resultsFoot"});
	}

	var errorDivs = document.querySelectorAll(".error");
	if (dbug && errorDivs.length > 0) console.log ("Found " + errorDivs.length + " errorDivs.");
	for (var i = 0; i < errorDivs.length; i++) {
		if (errorDivs[i].hasAttribute("id")) {
			var id = errorDivs[i].getAttribute("id");
			var referrers = document.querySelectorAll("[aria-describedby="+id+"]");
			for (var j = 0; j<referrers.length; j++) {
				if (referrers[j].getAttribute("aria-describedby") == id) {
					referrers[j].removeAttribute("aria-describedby");
				} else {
					referrers[j].setAttribute("aria-describedby", referrers[j].getAttribute("aria-describedby").replace(id, "").replace(/\s+/, " "));
				}
			}
		}
		errorDivs[i].parentNode.removeChild(errorDivs[i]);
	}

	// get salary?
	//dbug = true;
	getSalary();

	// Add promotions
	addPromotions();
	//dbug = false;
	// Add actings
	getActings ();

	// Add lwops
	getLWoPs ();

	// Add Overtimes
	getOvertimes();
	// Add Lump Sums
	getLumpSums ();

	setURL();
	calculate();

} // End of startProcess

function resetPeriods () {
	periods = [];
	periods = initPeriods;
	if (dbug) console.log ("resetPeriods::initPeriods: " + initPeriods + ".");
	if (dbug) console.log ("resetPeriods::periods: " + periods + ".");
} // End of resetPeriods

// getSalary called during startProcess.  "guess" isn't really a good word for this, so I changed it to "get"

// I don't get it.  What's the difference btween selectSalary and getSalary?
// This ones starts: get the CS-0level, get the startDateText date, check for leapyear, set the startDateTxt value, figure out your step, select the step
function getSalary () {
	var levelSelect = document.getElementById("levelSelect");
	var lvl = levelSelect.value.replace(/\D/, "");
	if (dbug) console.log ("Got level " + lvl + "."); // and start date of " + startDate + ".");
	if (lvl < 1 || lvl > 5) {	// Should only happen if someone messes with the querystring
		if (dbug) console.log ("getSalary::Error:  lvl is -1.");
		var errDiv = createHTMLElement("div", {"parentNode":levelSelect.parentNode, "id":"levelSelectError", "class":"error"});
		createHTMLElement("span", {"parentNode":errDiv, "nodeText":"Please select a level"});
		levelSelect.setAttribute("aria-describedby", "levelSelectError");
		levelSelect.focus();
		//return;
	} else {
		saveValues.push("lvl="+lvl);
	}
	level = ((lvl > 0 && lvl < salaries.length+1) ? lvl : null);

	let startDate = getStartDate();
	if (level && startDate) {
		
		level -= 1;

		if (dbug) console.log("getSalary::Got valid data (" + startDate.toISOString().substr(0,10) + ")....now trying to figure out salary.");
			
		let timeDiff = (TABegin - startDate) / day;


		if (stepSel.value && stepSel.value >= 0 && stepSel.value < salaries[level].length) {
			step = stepSel.value;
			if (dbug) console.log ("getSalary::Got step from the stepSel.  And it's " + step + ".");
		} else {
			if (dbug) console.log ("getSalary::Couldn't get step from the stepSel. Gotta guess. stepSel.value: " + stepSel.value + ".");
			if (dbug) console.log ("getSalary::TimeDiff: "  + timeDiff + ".");
		
			let years = Math.floor(timeDiff/365);
			step = Math.min(years, salaries[level].length-1);
			if (dbug) console.log ("getSalary::Your step would be " + step + ".");
		}
		var stp = step;

		saveValues.push("stp="+stp);
		saveValues.push("strtdt="+startDateTxt.value);
		saveValues.push("enddt="+endDateTxt.value);

		let dparts = null;
		dparts = endDateTxt.value.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
		if (dparts) {
			EndDate = new Date(dparts[1], (dparts[2]-1), dparts[3]);
			EndDate.setDate(EndDate.getDate() + parseInt(1));
			if (dbug) console.log ("getSalary::Got EndDateTxt as " + endDateTxt.value + ".");
			//if (dbug) console.log ("Got EndDate as " + EndDate.toISOString().substr(0, 10) + ".");
		}
		//This used to be below adding anniversaries, but some anniversaries were being missed
		if (dbug) console.log ("getSalary::About to set EndDate to " + EndDate.toISOString().substr(0, 10) + ".");
		addPeriod ({"startDate" : EndDate.toISOString().substr(0, 10), "increase":0, "reason":"end", "multiplier" : 1});

		//add anniversarys
		//dbug = true;
		let startYear = Math.max(2018, startDate.getFullYear());
		if (dbug) console.log ("getSalary::Going to set anniversary dates betwixt: " + startYear + " and " + EndDate.getFullYear() + ".");
		for (var i = startYear; i <=EndDate.getFullYear(); i++) {
			if (stp < salaries[level].length) {
				let dateToAdd = i + "-" + ((startDate.getMonth()+1) > 9 ? "" : "0") + (startDate.getMonth()+1)	+ "-" + (startDate.getDate() > 9 ? "" : "0") +  startDate.getDate();
				if (dbug) console.log ("getSalary::Going to set anniversary date " + dateToAdd + ".");
				if (dateToAdd > startDate.toISOString().substr(0,10)) {
					if (dbug) console.log ("getSalary::Going to add anniversary on " + dateToAdd + " because it's past " + startDate.toISOString().substr(0,10) + ".");
					addPeriod ({"startDate": dateToAdd, "increase":0, "reason":"Anniversary Increase", "multiplier":1});
					stp++;
				} else {
					if (dbug) console.log ("getSalary::Not going to add anniversary on " + dateToAdd + " because it's too early.");
				}
			}
		}
		//dbug = false;
		if (timeDiff < 0) {
			if (dbug) console.log ("getSalary::You weren't even there then.");
			// remove all older periods?? Maybe?  Or just somehow make them 0s?
			// This one makes the mulitpliers 0.
			addPeriod ({"startDate" : startDate.toISOString().substr(0,10), "increase":0, "reason":"Starting", "multiplier":1});
			for (var i = 0; i < periods.length; i++) {
				if (startDate.toISOString().substr(0,10) > periods[i]["startDate"]) periods[i]["multiplier"] = 0;
			}
			
			// This one removes the ones before start date.
			// This _sounds_ good, but it totally messes up the compounding raises later.
			/*
			addPeriod ({"startDate" : startDate.toISOString().substr(0,10), "increase":0, "reason":"Starting", "multiplier":1});
			do {
				periods.shift();
			} while (periods[0]["startDate"] <= startDate.toISOString().substr(0,10) && periods[0]["reason"] != "Starting");
			*/
			//for (var i = periods.length-1; i >=0; i--)
			/*
			if (dbug) console.log ("getSalary::From step " + step + ".");
			step = step - startYear - EndDate.getFullYear();
			if (dbug) console.log ("getSalary::to step " + step + ".");
			*/
		} else {
			//var salary = salaries[level][step];
			//if (dbug) console.log ("You were there at that point, and your salary would be $" + salary.toFixed(2) + ".");
		}
		if (dbug) {
			console.log("getSalary::pre-calc checks:");
			for (var i = 0; i < periods.length; i++) {
				console.log ("getSalary::" + periods[i]["reason"] + ": " + periods[i]["startDate"] + ".");
			}
		}

	} else {
		if (dbug) console.log ("getSalary::Something's not valid.  Lvl: " + level + ", startDate: " + startDate + ".");
		addStartDateErrorMessage();
	}
} // End of getSalary

function addPromotions () {
	// Add promotions
	var promotions = document.querySelectorAll(".promotions");
	var numOfPromotions = promotions.length;
	if (dbug) console.log("addPromotions::Checking for " + numOfPromotions + " promotions.");
	for (var i = 0; i < promotions.length; i++) {
		var promoLevel = promotions[i].getElementsByTagName("select")[0].value;
		if (dbug) console.log("addPromotions::promoLevel " + i + ": " + promoLevel + ".");
		var promoDate  = promotions[i].getElementsByTagName("input")[0].value.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
		if (dbug) console.log("addPromotions::promoDate " + i + ": " + promoDate[0] + ".");
		if (promoDate) {
			if (promoDate[0] > TABegin.toISOString().substr(0,10) && promoDate[0] < EndDate.toISOString().substr(0, 10) && promoLevel > 0 && promoLevel <=5) {
				if (dbug) console.log ("addPromotions::Adding a promotion on " + promoDate[0] + " at level " + promoLevel +".");
				// add the promo period
				var j = addPeriod ({"startDate":promoDate[0],"increase":0, "reason":"promotion", "multiplier":1, "level":(promoLevel-1)});
				// remove future anniversaries
				for (var k = j; k < periods.length; k++) {
					if (periods[k]["reason"] == "Anniversary Increase") {
						periods.splice(k, 1);
					}
				}
				// add anniversaries
				var k = parseInt(promoDate[1])+1;
				if (dbug) console.log ("addPromotions::Starting with promo anniversaries k: " + k + ", and make sure it's <= " + EndDate.getFullYear() + ".");
				for (k; k <= EndDate.getFullYear(); k++) {
					if (dbug) console.log ("addPromotions::Adding anniversary date " + k + "-" + promoDate[2] + "-" + promoDate[3] + ".");
					addPeriod ({"startDate": k + "-" + promoDate[2] + "-" + promoDate[3], "increase":0, "reason":"Anniversary Increase", "multiplier":1});
				}
				saveValues.push("pdate" + i + "=" + promoDate[0]);
				saveValues.push("plvl" + i + "=" + promoLevel);

			} else {
				if (dbug) {
					if (promoDate[0] > TABegin.toISOString().substr(0,10)) console.log ("addPromotions::It's after the beginning.");
					if (promoDate[0] < EndDate.toISOString().substr(0, 10)) console.log ("addPromotions::It's before the end.");
					if (promoLevel > 0) console.log ("addPromotions::It's greater than 0.");
					if (promoLevel < 5) console.log ("addPromotions::It's less than or equal to 5.");
				}
			}
		} else {
			if (dbug) console.log("addPromotions::Didn't get promoDate.");
		}
	}
} // End of addPromotions

function getActings () {
	// Add actings
	var actingStints = document.querySelectorAll(".actingStints");
	if (dbug) console.log ("getActings::Dealing with " + actingStints.length + " acting stints.");

	for (var i =0; i < actings; i++) {
		var actingLvl = actingStints[i].getElementsByTagName("select")[0].value;
		var dates = actingStints[i].getElementsByTagName("input");
		var actingFromDate = dates[0].value;
		var actingToDate = dates[1].value;
		if (dbug) console.log("getActings::Checking acting at " + actingLvl + " from " + actingFromDate + " to " + actingToDate + ".");
		if (actingLvl >=0 && actingLvl <5 && actingFromDate.match(/\d\d\d\d-\d\d-\d\d/) && actingToDate.match(/\d\d\d\d-\d\d-\d\d/)) {
			if (dbug) console.log ("getActings::Passed the initial tests.");
			if (actingFromDate <= EndDate.toISOString().substr(0, 10) && actingToDate >= TABegin.toISOString().substr(0,10) && actingToDate > actingFromDate) {
				if (actingFromDate < TABegin.toISOString().substr(0,10) && actingToDate >= TABegin.toISOString().substr(0,10)) actingFromDate = TABegin.toISOString().substr(0,10);
				if (dbug) console.log ("getActings::And the dates are in the right range.");
				// add a period for starting
				var from = addPeriod({"startDate":actingFromDate, "increase":0, "reason":"Acting Start", "multiplier":1, "level":(actingLvl-1)});

				// add a period for returning
				var toParts = actingToDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
				actingToDate = new Date(toParts[1], (toParts[2]-1), toParts[3]);
				actingToDate.setDate(actingToDate.getDate() + parseInt(1));
				var to = addPeriod({"startDate":actingToDate.toISOString().substr(0, 10), "increase":0, "reason":"Acting Finished", "multiplier":1});
				var fromParts = actingFromDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
				actingFromDate = new Date(fromParts[1], (fromParts[2]-1), fromParts[3]);
				
				for (var j = parseInt(fromParts[1])+1; j < toParts[1]; j++) {
					if (j + "-" + fromParts[2] + "-" + fromParts[3] < actingToDate.toISOString().substr(0, 10)) {
						addPeriod({"startDate":j + "-" + fromParts[2] + "-" + fromParts[3], "increase":0, "reason":"Acting Anniversary", "multiplier":1});
					}
				}
				saveValues.push("afrom" + i + "=" + actingFromDate.toISOString().substr(0, 10));
				saveValues.push("ato" + i + "=" + actingToDate.toISOString().substr(0, 10));
				saveValues.push("alvl" + i + "=" + actingLvl);
			} else {
				if (dbug) {
					if (actingFromDate <= EndDate.toISOString().substr(0, 10)) console.log ("getActings::actingFrom is before EndDate");
					if (actingToDate >= TABegin.toISOString().substr(0,10)) console.log ("getActings::actingTo is after startDate");
					if (actingToDate <= EndDate.toISOString().substr(0, 10)) console.log ("getActings::actingTo is before EndDate");
					if (actingToDate > actingFromDate) console.log ("getActings::actingTo is after actingFrom");
				}
			}
		} else {
			if (dbug) {
				if (actingLvl >=0) console.log ("getActings::actingLvl >= 0");
				if (actingLvl <5) console.log ("getActings::actingLvl < 5");
				if (actingFromDate.match(/\d\d\d\d-\d\d-\d\d/)) console.log ("getActings::actingFrom is right format.");
				if (actingToDate.match(/\d\d\d\d-\d\d-\d\d/)) console.log ("getActings::actingTo is right format.");
			}
		}
	}
} // End of getActings

function getLWoPs () {
	// Add lwops
	var lwopStints = document.querySelectorAll(".lwopStints");
	if (dbug) console.log ("Dealing with " + lwopStints.length + " lwops.");
	
	for (var i =0; i < lwopStints.length; i++) {
		var dates = lwopStints[i].getElementsByTagName("input");
		var lwopFromDate = dates[0].value;
		var lwopToDate = dates[1].value;
		if (lwopFromDate.match(/\d\d\d\d-\d\d-\d\d/) && lwopToDate.match(/\d\d\d\d-\d\d-\d\d/)) {
			if (dbug) console.log ("getLWoPs::Passed the initial tests for " + lwopFromDate + " to " + lwopToDate + ".");
			if (lwopFromDate <= EndDate.toISOString().substr(0, 10) && 
					lwopToDate >= TABegin.toISOString().substr(0,10) && 
					lwopToDate > lwopFromDate) {
				if (lwopFromDate <= TABegin.toISOString().substr(0, 10) && lwopToDate >= TABegin.toISOString().substr(0,10)) lwopFromDate = TABegin.toISOString().substr(0, 10);
				if (lwopFromDate <= EndDate.toISOString().substr(0, 10) && lwopToDate > EndDate.toISOString().substr(0, 10)) lwopToDate = EndDate.toISOString().substr(0, 10);
				if (dbug) console.log ("getLWoPs::And the dates are in the right range.");
				// add a period for starting
				var from = addPeriod({"startDate":lwopFromDate, "increase":0, "reason":"LWoP Start", "multiplier":0});

				// add a period for returning
				var toParts = lwopToDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
				lwopToDate = new Date(toParts[1], (toParts[2]-1), toParts[3]);
				lwopToDate.setDate(lwopToDate.getDate() + parseInt(1));
				var to = addPeriod({"startDate":lwopToDate.toISOString().substr(0, 10), "increase":0, "reason":"LWoP Finished", "multiplier":1});
				for (var j = from; j < to; j++) {
					periods[j]["multiplier"] = 0;
				}

				saveValues.push("lfrom" + i + "=" + lwopFromDate); //.toISOString().substr(0, 10));
				saveValues.push("lto" + i + "=" + lwopToDate.toISOString().substr(0, 10));
				//var fromParts = lwopFromDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
				//lwopFromDate = new Date(fromParts[1], (fromParts[2]-1), fromParts[3]);
			} else {
				if (dbug) {
					if (lwopFromDate <= EndDate.toISOString().substr(0, 10)) console.log ("lwopFrom is before EndDate");
					if (lwopToDate >= TABegin.toISOString().substr(0,10)) console.log ("lwopTo is after startDate");
					if (lwopToDate > lwopFromDate) console.log ("lwopTo is after lwopFrom");
				}
			}
		} else {
			if (dbug) {
				if (lwopFromDate.match(/\d\d\d\d-\d\d-\d\d/)) console.log ("getLWoPs::lwopFrom is right format.");
				if (lwopToDate.match(/\d\d\d\d-\d\d-\d\d/)) console.log ("getLWoPs::lwopTo is right format.");
			}
		}
	}
} // End of getLWoPs
	
function getOvertimes () {
	// Add Overtimes
	var overtimeStints = document.querySelectorAll(".overtimes");
	if (dbug) console.log ("overtimes::Dealing with " + overtimeStints.length + " overtimes.");
	
	for (var i =0; i < overtimeStints.length; i++) {
		var overtimeDate = overtimeStints[i].querySelector("input[type=date]").value;
		var overtimeAmount = overtimeStints[i].querySelector("input[type=text]").value.replace(/[^\d\.]/, "");
		var overtimeRate = overtimeStints[i].querySelector("select").value;
		if (overtimeDate.match(/\d\d\d\d-\d\d-\d\d/)) {
			if (dbug) console.log ("Passed the initial tests.");
			if (overtimeDate >= TABegin.toISOString().substr(0,10) && overtimeDate <= EndDate.toISOString().substr(0, 10) && overtimeAmount > 0) {
				if (dbug) console.log ("overtimes::And the dates are in the right range.");
				// add a period for starting
				
				var from = addPeriod({"startDate":overtimeDate, "increase":0, "reason":"Overtime", "multiplier":0, "hours":overtimeAmount, "rate":overtimeRate});
				saveValues.push("otdate" + i + "=" + overtimeDate);
				saveValues.push("otamt" + i + "=" + overtimeAmount);
				saveValues.push("otrt" + i + "=" + overtimeRate);

			} else {
				if (dbug) {
					if (overtimeDate >= TABegin.toISOString().substr(0,10)) console.log ("overtimeDate is after startDate");
					if (overtimeDate <= EndDate.toISOString().substr(0, 10)) console.log ("overtimeDate is before EndDate");
					if (overtimeAmount > 0) console.log ("overtimeAmount > 0");
				}
			}
		} else {
			if (dbug) {
				if (overtimeDate.match(/\d\d\d\d-\d\d-\d\d/)) console.log ("overtimeDate is right format.");
			}
		}
	}
} // End of getOvertimes

function getLumpSums () {
	// Add LumpSums
	var lumpsums = document.querySelectorAll(".lumpSums");
	if (dbug) console.log ("Dealing with " + lumpsums.length + " lumpsums.");
	
	for (var i =0; i < lumpsums.length; i++) {
		var lumpSumDate = lumpsums[i].querySelector("input[type=date]").value;
		var lumpSumAmount = lumpsums[i].querySelector("input[type=text]").value.replace(/[^\d\.]/, "");
		if (lumpSumDate.match(/\d\d\d\d-\d\d-\d\d/)) {
			if (dbug) console.log ("Passed the initial tests.");
			if (lumpSumDate >= TABegin.toISOString().substr(0,10) && lumpSumDate <= EndDate.toISOString().substr(0, 10) && lumpSumAmount > 0) {
				if (dbug) console.log ("And the dates are in the right range.");
				// add a period for starting
				var from = addPeriod({"startDate":lumpSumDate, "increase":0, "reason":"Lump Sum", "multiplier":0, "hours":lumpSumAmount});

				saveValues.push("lsdate" + i + "=" + lumpSumDate);
				saveValues.push("lsamt" + i + "=" + lumpSumAmount);
				
			} else {
				if (dbug) {
					if (lumpSumDate >= TABegin.toISOString().substr(0,10)) console.log ("lumpSumDate is after startDate");
					if (lumpSumDate <= EndDate.toISOString().substr(0, 10)) console.log ("lumpSumDate is before EndDate");
					if (lumpSumAmount > 0) console.log ("lumpSumAmount > 0");
				}
			}
		} else {
			if (dbug) {
				if (lumpSumDate.match(/\d\d\d\d-\d\d-\d\d/)) console.log ("lumpSumDate is right format.");
			}
		}
	}
} // End of getLumpSums

function addPromotionHandler() {
	let toFocus = true;
	let pdate = null;
	let plvl = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		if (dbug) console.log("addPromotionHandler::arguments: " + arguments.length);
		if (args.hasOwnProperty("toFocus")) toFocus = args["toFocus"];
		if (args.hasOwnProperty("date")) {
			pdate = (isValidDate(args["date"]) ? args["date"] : null);
		}
		if (args.hasOwnProperty("level")) {
			plvl = args["level"].replaceAll(/\D/g, "");
			plvl = (plvl > 0 && plvl < 6 ? plvl : null);
		}
		if (dbug) console.log(`addPromotionHandler::toFocus: ${toFocus}, pdate: ${pdate}, plvl: ${plvl}.`);
	}
	let promotionsDiv = document.getElementById("promotionsDiv");

	// Find the next available promotion ID by extracting the highest current ID and incrementing it.

	let id = 0;
	while (promotionsDiv.querySelector("#promo" + id)) { id++; }

	let newPromotionFS = createHTMLElement("fieldset", { "parentNode": promotionsDiv, "class": "fieldHolder promotions", "id": "promo" + id});
	createHTMLElement("legend", {"parentNode": newPromotionFS, "textNode": "Promotion " + (id + 1)});
	createHTMLElement("label", { "parentNode": newPromotionFS, "for": "promoDate" + id, "nodeText": "Date of promotion: " });
	let newPromoDate = createHTMLElement("input", { "parentNode": newPromotionFS, "type": "date", "id": "promoDate" + id, "aria-describedby": "dateFormat", "value": (pdate ? pdate : null) });
	if (toFocus) newPromoDate.focus();

	createHTMLElement("label", { "parentNode": newPromotionFS, "for": "promotionLevel" + id, "nodeText": "Promoted to level: " });
	let newPromotionSel = createHTMLElement("select", {"parentNode": newPromotionFS, "id": "promotionLevel" + id});

	// TODO: Add bookmarking options somewhere around here

	for (let j = 0; j < data.chosenCA().levels; j++) {
		let newPromoOpt = createHTMLElement("option", { "parentNode": newPromotionSel, "value": j, "nodeText": (classification +"-" + (j +1))});
		if (plvl) { if (plvl === j) newPromoOpt.setAttribute("selected", "selected"); }
		else {
			if (level + 1 === j) newPromoOpt.setAttribute("selected", "selected");
		}
	}

	let promoButtonsDiv = null;
	if (id === 0) {
		promoButtonsDiv = createHTMLElement("div", {"parentNode": newPromotionFS, "id": "promoButtonsDiv"});
		let newDelPromotionBtn = createHTMLElement("input", {
			"parentNode": promoButtonsDiv,
			"type": "button",
			"value": "Remove",
			"id": "removePromotionBtn" + id
		});
		let newAddPromotionBtn = createHTMLElement("input", {
			"parentNode": promoButtonsDiv,
			"type": "button",
			"value": getStr("addAnotherPromotion"),
			"class": "promotionsBtn",
			"id": "addPromotionsBtn" + id
		});
		newAddPromotionBtn.addEventListener("click", addPromotionHandler, false);
		newDelPromotionBtn.addEventListener("click", removePromotionDiv, false);
	} else {
		promoButtonsDiv = document.getElementById("promoButtonsDiv");
		newPromotionFS.appendChild(promoButtonsDiv);
	}

	resultStatus.innerHTML = "New Acting section added.";
} // End of addPromotionHandler

function removePromotionDiv (e) {
	let promoButtonsDiv = document.getElementById("promoButtonsDiv");
	let promoFS = null;
	let promoDate = null;

	let promoText = e.target.closest(".promotions").id;
	let promotions = Number(promoText.replace("promo",""));
	let rmPromoFS = document.getElementById("promo" + promotions);
	if (promotions === 0) {
		addPromotionBtn.focus();
	} else {
		promoFS = document.getElementById("promo" + (promotions-1));
		if (promoFS) promoFS.appendChild(promoButtonsDiv);
		promoDate = document.getElementById("promoDate" + (promotions-1));
		if (promoDate) promoDate.focus();
	}

	rmPromoFS.parentNode.removeChild(rmPromoFS);
	rmPromoFS = null;

	resultStatus.innerHTML="Promotion section removed.";
} // End of removePromotionDiv

function addActingHandler () {
	let toFocus = true;
	let afdate = null;
	let atdate = null;
	let alvl = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		if (dbug) console.log ("addActingHandler::arguments: " + arguments.length);
		if (args.hasOwnProperty("toFocus")) toFocus = args["toFocus"];
		if (args.hasOwnProperty("from")) {
			afdate = (isValidDate(args["from"]) ? args["from"] : null);
		}
		if (args.hasOwnProperty("to")) {
			atdate = (isValidDate(args["to"]) ? args["to"] : null);
		}
		if (args.hasOwnProperty("level")) {
			alvl = args["level"].replaceAll(/\D/g, "");
			alvl = (alvl >0 && alvl <6 ? alvl : null);
		}
		if (dbug) console.log (`addActingHandler::toFocus: ${toFocus}, from: ${afdate} to ${atdate}, alvl: ${alvl}.`);
	}

	var actingsDiv = document.getElementById("actingsDiv");
	
	var id = actings;
	var looking = true;
	while (looking) {
		if (document.getElementById("actingLevel" + id)) {
			id++;
		} else {
			looking = false;
		}
	}

	var newActingFS = createHTMLElement("fieldset", {"parentNode":actingsDiv, "class":"fieldHolder actingStints", "id":"acting"+id});
	var newActingLegend = createHTMLElement("legend", {"parentNode":newActingFS, "textNode":"Acting Stint " + (id+1)});

	var newActingFromLbl = createHTMLElement("label", {"parentNode":newActingFS, "textNode":"From", "for":"actingFrom" + id});
	var newActingFromDate = createHTMLElement("input", {"parentNode":newActingFS, "id":"actingFrom"+id, "type":"date", "aria-describedby":"dateFormat", "value":(afdate ? afdate : null)});
	var newActingToLbl = createHTMLElement("label", {"parentNode":newActingFS, "textNode":"To", "for":"actingTo"+id});
	var newActingToDate = createHTMLElement("input", {"parentNode":newActingFS, "id":"actingTo"+id, "type":"date", "aria-describedby":"dateFormat", "value":(atdate ? atdate : null)});

	var newLevelLbl = createHTMLElement("label", {"parentNode":newActingFS, "for":"actingLevel" + id, "nodeText":"Acting Level: "});
	var newActingSel = createHTMLElement("select", {"parentNode":newActingFS, "id":"actingLevel" + id});
	for (var j = 0; j < 6; j++) {
		var newPromoOpt = createHTMLElement("option", {"parentNode":newActingSel, "value": j, "nodeText":(j == 0 ? "Select Level" : "CS-0" + j)});
		if (alvl) {
			if (alvl == j) newPromoOpt.setAttribute("selected", "selected");
		} else {
			if (parseInt(levelSel.value)+1 == j) newPromoOpt.setAttribute("selected", "selected");
		}
	}


	//newActingSel.addEventListener("change", saveValue, false);

	let actingButtonsDiv = null;
	if (id == 0) {
		actingButtonsDiv = createHTMLElement("div", {"parentNode":newActingFS, "id":"actingButtonsDiv"});
		var newDelActingBtn = createHTMLElement("input", {"parentNode":actingButtonsDiv, "type":"button", "value":"Remove", "id": "removeActingBtn" + actings});
		var newAddActingBtn = createHTMLElement("input", {"parentNode":actingButtonsDiv, "type":"button", "value":"Add another Acting", "class":"actingBtn", "id": "addActingsBtn" + id});
		newAddActingBtn.addEventListener("click", addActingHandler, false);
		newDelActingBtn.addEventListener("click", removeActingDiv, false);
	} else {
		actingButtonsDiv = document.getElementById("actingButtonsDiv");
		newActingFS.appendChild(actingButtonsDiv);
	}

	if (toFocus) newActingFromDate.focus();

	actings++;
	resultStatus.innerHTML="New Acting section added.";
} // End of addActingHandler

function addLWoPHandler () {
	let toFocus = true;
	let lfrom = null;
	let lto = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		if (dbug) console.log ("addLWoPHandler::arguments: " + arguments.length);
		if (args.hasOwnProperty("toFocus")) toFocus = args["toFocus"];
		if (args.hasOwnProperty("from")) {
			lfrom = (isValidDate(args["from"]) ? args["from"] : null);
		}
		if (args.hasOwnProperty("to")) {
			lto = (isValidDate(args["to"]) ? args["to"] : null);
		}
		if (dbug) console.log (`addLWoPHandler::toFocus: ${toFocus}, from: ${lfrom} to ${lto}.`);
	}

	var LWoPDiv = document.getElementById("LWoPDiv");

	var id = lwops;
	var looking = true;
	while (looking) {
		if (document.getElementById("lwopFrom" + id)) {
			id++;
		} else {
			looking = false;
		}
	}

	var newLWoPFS = createHTMLElement("fieldset", {"parentNode":LWoPDiv, "class":"fieldHolder lwopStints", "id":"lwop"+id});
	var newLWoPLegend = createHTMLElement("legend", {"parentNode":newLWoPFS, "textNode":"LWoP Stint " + (id+1)});

	var newLWoPFromLbl = createHTMLElement("label", {"parentNode":newLWoPFS, "textNode":"From", "for":"lwopFrom" + id});
	var newLWoPFromDate = createHTMLElement("input", {"parentNode":newLWoPFS, "id":"lwopFrom"+id, "type":"date", "aria-describedby":"dateFormat", "value":(lfrom ? lfrom : null)});
	var newLWoPToLbl = createHTMLElement("label", {"parentNode":newLWoPFS, "textNode":"To", "for":"lwopTo"+id});
	var newLWoPToDate = createHTMLElement("input", {"parentNode":newLWoPFS, "id":"lwopTo"+id, "type":"date", "aria-describedby":"dateFormat", "value" : (lto ? lto : null)});

	let lwopButtonsDiv = null;
	if (id == 0) {
		lwopButtonsDiv = createHTMLElement("div", {"parentNode":newLWoPFS, "id":"lwopButtonsDiv"});
		var newDelLWoPBtn = createHTMLElement("input", {"parentNode":lwopButtonsDiv, "type":"button", "value":"Remove", "id": "removeLWoPBtn" + lwops});
		var newAddLWoPBtn = createHTMLElement("input", {"parentNode":lwopButtonsDiv, "type":"button", "value":"Add another LWoP", "class":"lwopBtn", "id": "addLWoPsBtn" + id});
		newAddLWoPBtn.addEventListener("click", addLWoPHandler, false);
		newDelLWoPBtn.addEventListener("click", removeLWoPDiv, false);
	} else {
		lwopButtonsDiv = document.getElementById("lwopButtonsDiv");
		newLWoPFS.appendChild(lwopButtonsDiv);
	}

	
	lwops++;
	if (toFocus) newLWoPFromDate.focus();
	resultStatus.innerHTML="New leave without pay section added.";
} // End of lWoPHandler

function addOvertimeHandler () {
	let toFocus = true;
	let otdate = null;
	let othours = null;
	let otrate = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		if (dbug) console.log ("addOvertimeHandler::arguments: " + arguments.length);
		if (args.hasOwnProperty("toFocus")) toFocus = args["toFocus"];
		if (args.hasOwnProperty("date")) {
			otdate = (isValidDate(args["date"]) ? args["date"] : null);
		}
		if (args.hasOwnProperty("hours")) {
			othours = (args["hours"] ? args["hours"] : null);
		}
		if (args.hasOwnProperty("rate")) {
			otrate = (["rate"] ? args["rate"] : null);
		}
		if (dbug) console.log (`addOvertimeHandler::toFocus: ${toFocus}, date: ${otdate} hours ${othours}, rate: ${otrate}.`);
	}

	var OvertimeDiv = document.getElementById("overtimeDiv");

	var id = overtimes;
	var looking = true;
	while (looking) {
		if (document.getElementById("overtimeDate" + id)) {
			id++;
		} else {
			looking = false;
		}
	}
	var newOvertimeFS = createHTMLElement("fieldset", {"parentNode":OvertimeDiv, "class":"fieldHolder overtimes", "id":"ot" + id});
	var newOvertimeLegend = createHTMLElement("legend", {"parentNode":newOvertimeFS, "textNode":"Overtime or Standby " + (id+1)});

	var newDateFieldHolder = createHTMLElement("div", {"parentNode":newOvertimeFS, "class":"fieldHolder"});
	var newOvertimeDateLbl = createHTMLElement("label", {"parentNode":newDateFieldHolder, "textNode":"Date of Overtime:", "for":"overtimeDate" + id});
	var newOvertimeDate = createHTMLElement("input", {"parentNode":newDateFieldHolder, "id":"overtimeDate"+id, "type":"date", "aria-describedby":"dateFormat", "value":(otdate ? otdate : null)});


	var newAmountFieldHolder = createHTMLElement("div", {"parentNode":newOvertimeFS, "class":"fieldHolder"});
	var newOvertimeAmountLbl = createHTMLElement("label", {"parentNode":newAmountFieldHolder, "textNode":"Hours-worth of overtime", "for":"overtimeAmount" + id});
	var newOvertimeAmount = createHTMLElement("input", {"parentNode":newAmountFieldHolder, "id":"overtimeAmount"+id, "type":"text", "value" : (othours ? othours : null)});

	var newRateFieldHolder = createHTMLElement("div", {"parentNode":newOvertimeFS, "class":"fieldHolder"});
	var newOvertimeRateLbl = createHTMLElement("label", {"parentNode":newAmountFieldHolder, "textNode":"Overtime Rate:", "for":"overtimeRate" + id});
	var newOvertimeRate = createHTMLElement("select", {"parentNode":newAmountFieldHolder, "id":"overtimeRate"+id});
	let rates = {"0" : "Select Overtime Rate", "0.125" : "1/8x - Standby", "1.0" : "1.0", "1.5" : "1.5", "2.0": "2.0"};
	createHTMLElement("option", {"parentNode":newOvertimeRate, "value":"0", "nodeText":"Select Overtime Rate"});
	
	for (let r in rates) {
		let rt = createHTMLElement("option", {"parentNode":newOvertimeRate, "value":r, "nodeText": rates[r]});
		if (otrate && otrate == r) rt.setAttribute("selected", "selected");
	}


	let otButtonsDiv = null;
	if (id == 0) {
		otButtonsDiv = createHTMLElement("div", {"parentNode":newOvertimeFS, "id":"otButtonsDiv"});
		var newDelOvertimeBtn = createHTMLElement("input", {"parentNode":otButtonsDiv, "type":"button", "value":"Remove", "id": "removeOvertimeBtn" + overtimes});
		var newAddOvertimeBtn = createHTMLElement("input", {"parentNode":otButtonsDiv, "type":"button", "value":"Add another Overtime", "class":"otBtn", "id": "addOvertimesBtn" + id});
		newAddOvertimeBtn.addEventListener("click", addOvertimeHandler, false);
		newDelOvertimeBtn.addEventListener("click", removeOvertimeDiv, false);
	} else {
		otButtonsDiv = document.getElementById("otButtonsDiv");
		newOvertimeFS.appendChild(otButtonsDiv);
	}
	if (toFocus) newOvertimeDate.focus();
	overtimes++;

	resultStatus.innerHTML="New overtime section added.";
} // End of addOvertimeHandler

function addLumpSumHandler () {
	let toFocus = true;
	let lsdate = null;
	let lshours = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		if (dbug) console.log ("addLumpSumHandler::arguments: " + arguments.length);
		if (args.hasOwnProperty("toFocus")) toFocus = args["toFocus"];
		if (args.hasOwnProperty("date")) {
			lsdate = (isValidDate(args["date"]) ? args["date"] : null);
		}
		if (args.hasOwnProperty("hours")) {
			lshours = (args["hours"] ? args["hours"] : null);
		}
		if (dbug) console.log (`addLumpSumHandler::toFocus: ${toFocus}, date: ${lsdate} hours ${lshours}.`);
	}

	var LumpSumDiv = document.getElementById("lumpSumDiv");

	var id = lumpSums;
	var looking = true;
	while (looking) {
		if (document.getElementById("lumpSumDate" + id)) {
			id++;
		} else {
			looking = false;
		}
	}
	var newLumpSumFS = createHTMLElement("fieldset", {"parentNode":LumpSumDiv, "class":"fieldHolder lumpSums", "id":"lumpSum" + id});
	var newLumpSumLegend = createHTMLElement("legend", {"parentNode":newLumpSumFS, "textNode":"Lump Sum " + (id+1)});

	var newDateFieldHolder = createHTMLElement("div", {"parentNode":newLumpSumFS, "class":"fieldHolder"});
	var newLumpSumDateLbl = createHTMLElement("label", {"parentNode":newDateFieldHolder, "textNode":"Date paid out:", "for":"lumpSumDate" + id});
	var newLumpSumDate = createHTMLElement("input", {"parentNode":newDateFieldHolder, "id":"lumpSumDate"+id, "type":"date", "aria-describedby":"dateFormat", "value" : (lsdate ? lsdate : null)});

	var newAmountFieldHolder = createHTMLElement("div", {"parentNode":newLumpSumFS, "class":"fieldHolder"});
	var newLumpSumAmountLbl = createHTMLElement("label", {"parentNode":newAmountFieldHolder, "textNode":"Hours-worth of payout", "for":"lumpSumAmount" + id});
	var newLumpSumAmount = createHTMLElement("input", {"parentNode":newAmountFieldHolder, "id":"lumpSumAmount"+id, "type":"text", "value" : (lshours ? lshours : "")});


	let lumpSumButtonsDiv = null;
	if (id == 0) {
		lumpSumButtonsDiv = createHTMLElement("div", {"parentNode":newLumpSumFS, "id":"lumpSumButtonsDiv"});
		var newDelLumpSumBtn = createHTMLElement("input", {"parentNode":lumpSumButtonsDiv, "type":"button", "value":"Remove", "id": "removeLumpSumBtn" + lumpSums});
		var newAddLumpSumBtn = createHTMLElement("input", {"parentNode":lumpSumButtonsDiv, "type":"button", "value":"Add another LumpSum", "class":"lumpSumBtn", "id": "addLumpSumsBtn" + id});
		newAddLumpSumBtn.addEventListener("click", addLumpSumHandler, false);
		newDelLumpSumBtn.addEventListener("click", removeLumpSumDiv, false);
	} else {
		lumpSumButtonsDiv = document.getElementById("lumpSumButtonsDiv");
		newLumpSumFS.appendChild(lumpSumButtonsDiv);
	}

	if (toFocus) newLumpSumDate.focus();


	/*
	var newDelLumpSumBtn = createHTMLElement("input", {"parentNode":newLumpSumFS, "type":"button", "value":"Remove", "id": "removeLumpSumBtn" + id});
	var newAddLumpSumBtn = createHTMLElement("input", {"parentNode":newLumpSumFS, "type":"button", "value":"Add another Lump Sum period", "class":"lumpsumBtn", "id":"addLumpSumsBtn" + id});
	newAddLumpSumBtn.addEventListener("click", addLumpSumHandler, false);
	newDelLumpSumBtn.addEventListener("click", removeLumpSumDiv, false);
	*/
	lumpSums++;
	resultStatus.innerHTML="New lump sum section added.";
} // End of addLumpSum Handler



function removeActingDiv (e) {
	let actingButtonsDiv = null;
	let actingFS = null;
	let actingFromDate = null;
	let rmActingFS = null;
	
	actingButtonsDiv = document.getElementById("actingButtonsDiv");

	actings--;
	rmActingFS = document.getElementById("acting" + actings);
	if (actings == 0) {
		addActingBtn.focus();
	} else {
		actingFS = document.getElementById("acting" + (actings-1));
		if (actingFS) actingFS.appendChild(actingButtonsDiv);
		actingFromDate = document.getElementById("actingFromDate" + (actings-1));
		if (actingFromDate) actingFromDate.focus();
	}

	rmActingFS.parentNode.removeChild(rmActingFS);
	rmActingFS = null;


	resultStatus.innerHTML="Acting section removed.";
} // End of removeActingDiv
function removeLWoPDiv (e) {
	let lwopButtonsDiv = null;
	let lwopFS = null;
	let lwopDate = null;
	let rmLwopFS = null;
	
	lwopButtonsDiv = document.getElementById("lwopButtonsDiv");

	lwops--;
	rmLwopFS = document.getElementById("lwop" + lwops);
	if (lwops == 0) {
		addLwopBtn.focus();
	} else {
		lwopFS = document.getElementById("lwop" + (lwops-1));
		if (lwopFS) lwopFS.appendChild(lwopButtonsDiv);
		lwopDate = document.getElementById("lwopFrom" + (lwops-1));
		if (lwopDate) lwopDate.focus();
	}

	rmLwopFS.parentNode.removeChild(rmLwopFS);
	rmLwopFS = null;
	resultStatus.innerHTML="Leave Without Pay section removed.";
} // End of removeLWoPDiv

function removeOvertimeDiv (e) {
	let otButtonsDiv = null;
	let otFS = null;
	let otDate = null;
	let rmOTFS = null;
	
	otButtonsDiv = document.getElementById("otButtonsDiv");

	overtimes--;
	rmOTFS = document.getElementById("ot" + overtimes);
	if (overtimes == 0) {
		addOvertimeBtn.focus();
	} else {
		otFS = document.getElementById("ot" + (overtimes-1));
		if (otFS) otFS.appendChild(otButtonsDiv);
		otDate = document.getElementById("overtimeDate" + (overtimes-1));
		if (otDate) otDate.focus();
	}

	rmOTFS.parentNode.removeChild(rmOTFS);
	rmOTFS = null;

	resultStatus.innerHTML="Overtime section removed.";
} // End of removeOvertimeDiv

function removeLumpSumDiv (e) {
	let lumpSumButtonsDiv = null;
	let lumpSumFS = null;
	let lumpSumDate = null;
	let rmLumpSumFS = null;
	
	lumpSumButtonsDiv = document.getElementById("lumpSumButtonsDiv");

	lumpSums--;
	rmLumpSumFS = document.getElementById("lumpSum" + lumpSums);
	if (lumpSums == 0) {
		addLumpSumBtn.focus();
	} else {
		lumpSumFS = document.getElementById("lumpSum" + (lumpSums-1));
		if (lumpSumFS) lumpSumFS.appendChild(lumpSumButtonsDiv);
		lumpSumDate = document.getElementById("lumpSumDate" + (lumpSums-1));
		if (lumpSumDate) lumpSumDate.focus();
	}

	rmLumpSumFS.parentNode.removeChild(rmLumpSumFS);
	rmLumpSumFS = null;

	/*
	var btn= e.target;
	var btnID = btn.getAttribute("id")
	btnID = btnID.replaceAll(/\D/g, "");
	if (btnID > 0) btnID--;
	var fs = btn.parentNode;
	fs.parentNode.removeChild(fs);
	lumpSums--;
	if (lumpSums == 0 || btnID < 0) {
		addLumpSumBtn.focus();
	} else {
		let lumpSumBtns = null;
		lumpSumBtns = document.getElementById("addLumpSumsBtn" + btnID);
		if (!lumpSumBtns) {
			for (var j = btnID; lumpSumBtns === null && j >0; j--) {
				lumpSumBtns = document.getElementById("addLumpSumsBtn" + j);
			}
			if (j == 0) lumpSumBtns = addLumpSumBtn;
		}
		

		try {
			lumpSumBtns.focus();
		}
		catch (ex) {
			console.error ("Exception: " + ex.toString());
			addLumpSumBtn.focus();
		}
	}
	*/
	resultStatus.innerHTML="Lump sum section removed.";
} // End of removeLumpSumDiv


function addPeriod (p) {
	var rv = null;
	if (dbug) console.log ("addPeriod::Gonna add period beginnging at " + p["startDate"] + " to periods (" + periods.length + ").");
	if (p["reason"] == "end") periods.push(p);
	if (p.startDate < periods[0]["startDate"]) return;
	var looking = true;
	if (p["startDate"] == periods[0]["startDate"]) {
		if (p["reason"] == "Anniversary Increase") {
			periods[0]["reason"] += " & " + p["reason"];
			looking = false;
			if (dbug) console.log ("addPeriod::Not gonna add this period because the anniversary date is the same as the first date of the CA.");
		}
	}
	if (p["reason"] == "Anniversary Increase" && dbug) {
		if (looking) {
			console.log ("addPeriod::Gonna start looking for the place to insert this anniversary increase.")
		} else {
			console.log ("addPeriod::Would look for the anniversary but looking is false.");
		}
	}
	for (var i = 1; i < periods.length && looking; i++) {
		//if (/*p["reason"] == "Anniversary Increase" && */dbug) console.log ("addPeriod::["+i+"]Is p[startDate](" + p["startDate"] + ") before periods["+i+"][startDate](" + periods[i]["startDate"] + ")?");
		if (p["startDate"] < periods[i]["startDate"]) {
			if (/*p["reason"] == "Anniversary Increase" && */dbug) console.log ("addPeriod::["+i+"]It is!");
			if (p["reason"] == "Lump Sum") {
				if (lumpSumPeriods.hasOwnProperty(periods["startDate"])) {
					lumpSumPeriods[periods[i-1]["startDate"]] += p["hours"];
					if (dbug) console.log ("Adding lump sum amount to " + periods[i-1]["startDate"] + " of " +p["hours"] + ".");
				} else {
					lumpSumPeriods[periods[i-1]["startDate"]] = p["hours"];
					if (dbug) console.log ("Adding lump sum amount for " + periods[i-1]["startDate"] + " of " +p["hours"] + ".");
				}
				looking = false;
			} else if (p["reason"] == "Overtime") {
				//dbug = true;
				if (dbug) console.log ("Does overtimePeriods have anything in " + periods[i-1]["startDate"] + "?");
				if (overtimePeriods.hasOwnProperty(periods[i-1]["startDate"])) {
					if (dbug) console.log ("Yes.  But does it have anything in rate: " + p["rate"] + "?");
					if (overtimePeriods[periods[i-1]["startDate"]].hasOwnProperty(p["rate"])) {
						if (dbug) console.log("Yup.  So gonna add " + periods[i-1]["startDate"][p["rate"]] + " to " + p["hours"] +".");
						overtimePeriods[periods[i-1]["startDate"]][p["rate"]] = (overtimePeriods[periods[i-1]["startDate"]][p["rate"]]*1) + (p["hours"]*1);
						if (dbug) console.log ("Adding overtime amount to " + periods[i-1]["startDate"] + " of " +p["hours"] + " x " + p["rate"] + ".");
						if (dbug) console.log ("And it came to " + overtimePeriods[periods[i-1]["startDate"]][p["rate"]] +".");
					} else {
						if (dbug) console.log ("No, so gonna set amount " + p["hours"] + " to " + periods[i-1]["startDate"][p["rate"]] + ".");
						overtimePeriods[periods[i-1]["startDate"]][p["rate"]] = p["hours"];
						if (dbug) console.log ("Adding overtime amount for " + periods[i-1]["startDate"] + " of " +p["hours"] + " x " + p["rate"] + " to equal " + overtimePeriods[periods[i-1]["startDate"]][p["rate"]] + " which should be " + p["hours"] + ".");
					}
				} else {
					if (dbug) console.log ("No.  So gonna add one.");
					if (dbug) console.log("addPeriod::p[rate]: " + p["rate"] + ".");
					if (dbug) console.log("addPeriod::p[hours]: " + p["hours"] + ".");
					overtimePeriods[periods[i-1]["startDate"]] = {};
					overtimePeriods[periods[i-1]["startDate"]][p["rate"]] = p["hours"];
					if (dbug) console.log("addPeriod::Now in " + periods[i-1]["startDate"] + " at rate of " + p["rate"] + ": " + overtimePeriods[periods[i-1]["startDate"]][p["rate"]] + ".");
				}
				looking = false;
				//dbug = false;
			} else {
				if (p["reason"] == "Anniversary Increase" && dbug) console.log ("addPeriod::Adding anniversary increase.");
				periods.splice(i, 0, p);
				rv = i;
				looking = false;
				if (p["reason"]=="end") {
					periods.splice(i+1); 
					rv = periods.length-1;
				}
			}
		} else if (p["startDate"] == periods[i]["startDate"]) {
			if (/*p["reason"] == "Anniversary Increase" && */dbug) console.log ("addPeriod::["+i+"]It's the same date!");
			if (p["reason"] == "Phoenix") {
				periods[i]["reason"] += " & Phoenix";
				looking = false;
				rv = i;
			} else if (p["reason"] == "Anniversary Increase" && periods[i]["reason"].match(/Contractual/)) {
				periods[i]["reason"] += " & Anniversary Increase";
				looking = false;
				rv = i;
			}
		} else {
			//if (/*p["reason"] == "Anniversary Increase" && */dbug) console.log ("addPeriod::["+i+"]It's after.");
		}
	}
	return rv;
} // End of addPeriod

function calculate() {
	resultStatus.innerHTML="";
	//if (step == salaries[level].length -1) {
		//if (dbug) console.log ("Top of your level.  This should be easy.");
		if (dbug) {
			console.log ("\n\nCalculating:  There are " + periods.length + " periods to be concerned with.");
			console.log ("With salary: " + salaries[level][step] + ".");
		}
		var actingStack = [];
		var multiplier = 1;
		var newSalaries = JSON.parse(JSON.stringify(salaries));
		var newDaily = JSON.parse(JSON.stringify(daily));
		var newHourly = JSON.parse(JSON.stringify(hourly));
		var preTotal = {"made":0, "shouldHaveMade":0, "backpay":0};
		var pTotal = {"made":0, "shouldHaveMade":0, "backpay":0};
		var total = {"made":0, "shouldHaveMade":0, "backpay":0};
		if (dbug) {
			console.log("prelim checks:");
			for (var i = 0; i < periods.length; i++) {
				console.log (periods[i]["reason"] + ": " + periods[i]["startDate"] + ".");
			}
		}
		for (var i = 0; i < periods.length-1; i++) {
			if (dbug) console.log(i + ": " + periods[i]["startDate"] + ":");
			if (dbug) console.log (i + ": going between " + periods[i]["startDate"] + " and " + periods[i+1]["startDate"] + " for the reason of " + periods[i]["reason"] + ".");
			if (periods[i]["reason"].match(/Anniversary Increase/)) {
				var output = "";
				if (actingStack.length == 0) {
					if (i ==0) {
						output += "Not increasing step because this is the first anniversary, and your anniversary is on this date.";
					} else {
						output += "Increasing step from " + step + " to ";
						step = Math.min(parseInt(step) + 1, salaries[level].length-1);
						output += step + ".";
					}
				} else {
					output += "Increasing non-acting step from " + actingStack[0]["step"] + " to ";
					actingStack[0]["step"] = Math.min(parseInt(actingStack[0]["step"]) +1, salaries[actingStack[0]["level"]].length-1);
					output += actingStack[0]["step"] + ".";
				}
				if (dbug) console.log (output);
			} else if (periods[i]["reason"] == "Acting Anniversary") {
				var output = "Increasing step from " + step + " to ";
				step = Math.min(step + 1, salaries[level].length-1);
				output += step + "."
				if (dbug) console.log (output);
			} else if (periods[i]["reason"] == "promotion") {
				var currentSal = salaries[level][step];
				var minNewSal = currentSal * 1.04;
				level = periods[i]["level"];
				var looking = true;
				for (var stp = 0; stp < salaries[level].length && looking; stp++) {
					if (salaries[level][stp] > minNewSal) {
						step = stp;
						looking = false;
					}
				}
			} else if (periods[i]["reason"] == "Acting Start") {
				actingStack.push({"level":level, "step":step});
				var currentSal = salaries[level][step];
				var minNewSal = currentSal * 1.04;
				level = periods[i]["level"];
				var looking = true;
				for (var stp = 0; stp < salaries[level].length && looking; stp++) {
					if (salaries[level][stp] > minNewSal) {
						step = stp;
						looking = false;
					}
				}

			} else if (periods[i]["reason"] == "Acting Finished") {
				var orig = actingStack.pop();
				step = orig["step"];
				level = orig["level"];
			}
			periods[i]["made"] = 0;
			periods[i]["shouldHaveMade"] = 0;
			periods[i]["backpay"] = 0;
			multiplier =(1 + (periods[i]["increase"]/100));
			if (dbug) console.log ("Multiplier: " + multiplier + ".");
			if (periods[i]["increase"] > 0) {
				// Calculate new salaries, dailys, and hourlys
				for (var l = 0; l < newSalaries.length; l++) {
					for (var s = 0; s < newSalaries[l].length; s++) {
						//if (dbug && l == level) console.log ("Multiplying " + newSalaries[l][s] + " * " + multiplier + ".");
						newSalaries[l][s] = (newSalaries[l][s] * multiplier).toFixed(2);
						newDaily[l][s] = (newSalaries[l][s] / 260.88); //.toFixed(2);
						newHourly[l][s] = (newSalaries[l][s] / 1956.6); //.toFixed(2);
						//if (dbug && l == level) console.log ("And it came to " + newSalaries[l][s] + ".");
					}
				}
				if (dbug) console.log ("Your annual salary went from " + salaries[level][step] + " to " + newSalaries[level][step] + ".");
			}
			var days = 0;
			if (step >= 0) {
				if (dbug) console.log ("current period: periods[" + i + "][startDate]: " + periods[i]["startDate"] + ".");
				if (dbug) console.log ("future period: periods[" + (i+1) + "][startDate]: " + periods[(i+1)]["startDate"] + ".");
				var dparts = periods[i]["startDate"].match(/(\d\d\d\d)-(\d\d?)-(\d\d?)/);
				var current = new Date(dparts[1], dparts[2]-1, dparts[3]);
				parts = periods[i+1]["startDate"].match(/(\d\d\d\d)-(\d\d?)-(\d\d?)/);
				var future = new Date(parts[1], parts[2]-1, parts[3]);
				//future.setDate(future.getDate() - 1);
				var diff = (future  - current) / day;
				if (dbug) console.log ("There were " + diff + " days between " + current.getFullYear() + "-" +  (current.getMonth()+1) +"-" + current.getDate() + " and " + future.getFullYear() + "-" + (future.getMonth()+1) + "-" + future.getDate() +".");
				while (current < future) {
					//if (dbug) console.log ("Now calculating for day " + current.toString() + ".");
					if (current.getDay() > 0 && current.getDay() < 6) {	// don't calculate weekends
						days++;
						periods[i]["made"] = periods[i]["made"] + daily[level][step] * periods[i]["multiplier"];	// multiplier is if you were there then or not.
						periods[i]["shouldHaveMade"] = (periods[i]["shouldHaveMade"] + (newDaily[level][step] * periods[i]["multiplier"]));
					}
					current.setDate(current.getDate() + parseInt(1));
		//			//if (dbug) console.log ("Now day is " + current.toString() + ".");
				}
			} else {
				if (dbug) console.log (periods[i]["startDate"] + ": Step is still " + step + " therefore, not adding anything to made.");
			}
			periods[i]["backpay"] = periods[i]["shouldHaveMade"] - periods[i]["made"];

			var newTR = createHTMLElement("tr", {"parentNode":resultsBody});
			let endDate = new Date(periods[i+1]["startDate"]);
			endDate.setDate(endDate.getDate() -1);
			var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": periods[i]["startDate"] + " - " + endDate.toISOString().substr(0,10)});
			var reasonDiv = createHTMLElement("div", {"parentNode":newPaidTD, "textNode":"(" + periods[i]["reason"] + ")", "class":"small"});
			var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(periods[i]["made"])}); //.toFixed(2)});
			var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(periods[i]["shouldHaveMade"])}); //.toFixed(2)});
			var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(periods[i]["backpay"])}); //.toFixed(2)});

			if (dbug || showExtraCols) {
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": "CS-0" + (level +1)});
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": (Math.max(1, (parseInt(step)+1)))});
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": (periods[i]["multiplier"] ? "Yes" : "No")});
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": (step >=0 ? (daily[level][step] * periods[i]["multiplier"]).toFixed(2) + " -> " + (newDaily[level][step] * periods[i]["multiplier"]).toFixed(2) : "0") + " / day"});
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": days});
			}
			
			if (overtimePeriods.hasOwnProperty(periods[i]["startDate"])) {
				if (dbug) console.log ("Yup there are OT for " + periods[i]["startDate"] + ".");
				for (var rate in overtimePeriods[periods[i]["startDate"]]) {
					if (dbug) console.log ("rate: " + rate + ".");
					if (dbug) console.log ("amount: " + overtimePeriods[periods[i]["startDate"]][rate] + ".");
					var made = overtimePeriods[periods[i]["startDate"]][rate] * hourly[level][step] * rate;
					var shouldHaveMade = overtimePeriods[periods[i]["startDate"]][rate] * newHourly[level][step] * rate;
					var backpay = shouldHaveMade - made;
					
					var newTR = createHTMLElement("tr", {"parentNode":resultsBody});
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": periods[i]["startDate"]});
					var reasonDiv = createHTMLElement("div", {"parentNode":newPaidTD, "textNode":"(Overtime Payment x " + rate + ")", "class":"small"});
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(made)}); //.toFixed(2)});
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(shouldHaveMade)}); //.toFixed(2)});
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(backpay)}); //.toFixed(2)});

					if (dbug || showExtraCols) {
						var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": "CS-0" + (level +1)});
						var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": parseInt(step)+1});
						var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": (periods[i]["multiplier"] ? "Yes" : "No")});
						var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": hourly[level][step] * periods[i]["multiplier"] + " * " + rate + "/hr"});
						var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": "Hourly " + overtimePeriods[periods[i]["startDate"]][rate]});
					}
	
					periods[i]["made"] += made;
					periods[i]["shouldHaveMade"] += shouldHaveMade;
					periods[i]["backpay"] += backpay;
				}
			} else {
				if (dbug) console.log ("Nope, there aren't OT for " + periods[i]["startDate"] + ".");
			}
			//dbug = false;

			if (lumpSumPeriods.hasOwnProperty(periods[i]["startDate"])) {
				var made = lumpSumPeriods[periods[i]["startDate"]] * hourly[level][step];
				var shouldHaveMade = lumpSumPeriods[periods[i]["startDate"]] * newHourly[level][step];
				var backpay = shouldHaveMade - made;
				
				var newTR = createHTMLElement("tr", {"parentNode":resultsBody});
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": periods[i]["startDate"]});
				var reasonDiv = createHTMLElement("div", {"parentNode":newPaidTD, "textNode":"(Lump Sum Payment)", "class":"small"});
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(made)}); //.toFixed(2)});
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(shouldHaveMade)}); //.toFixed(2)});
				var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": formatter.format(backpay)}); //.toFixed(2)});

				
				if (dbug || showExtraCols) {
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": "CS-0" + (level +1)});
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": parseInt(step)+1});
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": (periods[i]["multiplier"] ? "Yes" : "No")});
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": hourly[level][step] * periods[i]["multiplier"] + "/hr"});
					var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": "Hourly " + lumpSumPeriods[periods[i]["startDate"]]});
				}

				periods[i]["made"] += made;
				periods[i]["shouldHaveMade"] += shouldHaveMade;
				periods[i]["backpay"] += backpay;
			}
			
			/*
			if (periods[i]["startDate"] < phoenixDateTxt.value) {
				preTotal["made"] += periods[i]["made"];
				preTotal["shouldHaveMade"] += periods[i]["shouldHaveMade"];
				preTotal["backpay"] += periods[i]["backpay"];
			} else {
				pTotal["made"] += periods[i]["made"];
				pTotal["shouldHaveMade"] += periods[i]["shouldHaveMade"];
				pTotal["backpay"] += periods[i]["backpay"];
			}
			*/
			total["made"] += periods[i]["made"];
			total["shouldHaveMade"] += periods[i]["shouldHaveMade"];
			total["backpay"] += periods[i]["backpay"];
			
		}
		if (resultsFoot) {
			/*
			var preTotalTR = createHTMLElement("tr", {"parentNode":resultsFoot});
			var preTH = createHTMLElement("th", {"parentNode":preTotalTR, "scope":"row", "nodeText":"Pre-Phoenix Total"});
			var preTD = createHTMLElement("td", {"parentNode":preTotalTR, "nodeText":"$" + preTotal["made"].toFixed(2)});
			var preTD = createHTMLElement("td", {"parentNode":preTotalTR, "nodeText":"$" + preTotal["shouldHaveMade"].toFixed(2)});
			var preTD = createHTMLElement("td", {"parentNode":preTotalTR, "nodeText":"$" + preTotal["backpay"].toFixed(2)});

			var pTotalTR = createHTMLElement("tr", {"parentNode":resultsFoot});
			var pTH = createHTMLElement("th", {"parentNode":pTotalTR, "scope":"row", "nodeText":"Phoenix Total"});
			var preTD = createHTMLElement("td", {"parentNode":pTotalTR, "nodeText":"$" + pTotal["made"].toFixed(2)});
			var preTD = createHTMLElement("td", {"parentNode":pTotalTR, "nodeText":"$" + pTotal["shouldHaveMade"].toFixed(2)});
			var preTD = createHTMLElement("td", {"parentNode":pTotalTR, "nodeText":"$" + pTotal["backpay"].toFixed(2)});

			total["made"] += preTotal["made"] + pTotal["made"];
			total["shouldHaveMade"] += preTotal["shouldHaveMade"] + pTotal["shouldHaveMade"];
			total["backpay"] += preTotal["backpay"] + pTotal["backpay"];
			*/
			var totalTR = createHTMLElement("tr", {"parentNode":resultsFoot});
			var totalTH = createHTMLElement("th", {"parentNode":totalTR, "scope":"row", "nodeText":"Total"});
			var preTD = createHTMLElement("td", {"parentNode":totalTR, "nodeText": formatter.format(total["made"])});
			var preTD = createHTMLElement("td", {"parentNode":totalTR, "nodeText": formatter.format(total["shouldHaveMade"])});
			var preTD = createHTMLElement("td", {"parentNode":totalTR, "nodeText": formatter.format(total["backpay"])});
		}
		resultStatus.innerHTML = "Results shown below.";
	//} else {
		//if (dbug) console.log ("Not the top of your level.  This should be difficult.");
		

	//}
} // End of calculate

function isValidDate (d) {
	let rv = false;
	try {
		if (!typeof(d) == "String") d = d.toString();
		let dateRE = /(\d\d\d\d)-(\d\d)-(\d\d)/;
		let dparts = d.match(dateRE);
		d = new Date(dparts[1], dparts[2]-1, dparts[3]);

		if (d >= TABegin && d<= EndDate) rv = true;
	}
	catch (ex) {
		console.error ("Something went wrong: " + ex.toString());
	}
	return rv;
} // End of isValidDate

function addStartDateErrorMessage () {
	if (dbug) console.log ("Error:  st is " + startDateTxt.value + ".");
	var errDiv = createHTMLElement("div", {"parentNode":startDateTxt.parentNode, "id":"startDateError", "class":"error"});
	createHTMLElement("p", {"parentNode":errDiv, "nodeText":"Please enter the date at which you started at the level you were at on December 22, 2018. If you weren't a CS at that time, enter the date you started as a CS.  All dates must be in the format of YYYY-MM-DD."});
	levelSel.setAttribute("aria-describedby", "startDateError");
	return;
}

var formatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',

  // These options are needed to round to whole numbers if that's what you want.
  //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  // Taken from https://stackoverflow.com/questions/149055/how-to-format-numbers-as-currency-string
});


function createHTMLElement (type, attribs) {
	let newEl = document.createElement(type);
	//This used to use a var mainForm, but I localized it to just access the element directly
	document.getElementById("mainForm").appendChild(newEl);

	var dbug = (arguments.length == 3 &&arguments[2] != null && arguments[2] != false ? true : false);
	for (var k in attribs) {
		if (dbug) console.log("Dealing with attrib " + k + ".");
		if (k == "parentNode") {
			if (dbug) console.log("Dealing with parentnode.");
			if (attribs[k] instanceof HTMLElement) {
				if (dbug) console.log("Appending...");
				attribs[k].appendChild(newEl);
			} else if (attribs[k] instanceof String || typeof(attribs[k]) === "string") {
				try {
					if (dbug) console.log("Getting, then appending...");
					document.getElementById(attribs[k]).appendChild(newEl);
				}
				catch (er) {
					console.error("Error creating HTML Element: " + er.message + ".");
				}
			}
		} else if (k == "textNode" || k == "nodeText") {
			if (dbug) console.log("Dealing with textnode " + attribs[k] + ".");
			if (typeof (attribs[k]) == "string") {
				if (dbug) console.log("As string...");
				newEl.appendChild(document.createTextNode(attribs[k]));
			} else if (attribs[k] instanceof HTMLElement) {
				if (dbug) console.log("As HTML element...");
				newEl.appendChild(attribs[k]);
			} else {
				if (dbug) console.log("As something else...");
				newEl.appendChild(document.createTextNode(attribs[k].toString()));
			}
		} else {
			newEl.setAttribute(k, attribs[k]);
		}
	}
	return newEl;
}
function removeChildren (el) {
	var dbug = (arguments.length == 2 && arguments[1] != null && arguments[1] != false ? true : false);
	while (el.firstChild) {	
		el.removeChild(el.firstChild);
	}
}

function isReady () {
	if (JSON.stringify(i18n) != "{}" && JSON.stringify(data) != "{}") {
		if (dbug) {
			console.log ("Got both");
			console.log ("Got json: "  + JSON.stringify(data) + ".");
			console.log ("Got json: "  + JSON.stringify(i18n) + ".");
		}
		init();
	} else {
		if (JSON.stringify(i18n) == "{}") {
			console.log ("Didn't get i18n, so must have gotten data.");
		}
		if (JSON.stringify(data) === "{}") {
			console.log ("Didn't get data, so must have gotten i18n.");
		}
		
	}
} // End of isReader

function setupEventListeners() {
    let groupSel = document.getElementById("groupSelect");
    groupSel.addEventListener("change", function () {
        group = groupSel.value;
        resetSelectors("groupSel");
        populateClassificationSelect();
    }, false);

    let classSel = document.getElementById("classificationSelect");
    classSel.addEventListener("change", function () {
        classification = classSel.value;
        resetSelectors("classSel");
        populateCASelect();
    }, false);

    let CASel = document.getElementById("CASelect");
    CASel.addEventListener("change", function () {
        chosenCA = CASel.value;
        resetSelectors("CASel");
        populateLevelSelect();
        generateTables(data.chosenCA());
    }, false);

    let levelSel = document.getElementById("levelSelect");
    levelSel.addEventListener("change", function () {
        level = Number(levelSel.value);
        resetSelectors("levelSel");
        populateStepSelect();
    }, false);

    let stepSel = document.getElementById("stepSelect");
    stepSel.addEventListener("change", function () {
        step = stepSel.value;
        resetSelectors("stepSel");
    }, false);

	let calcBtn = document.getElementById("calcBtn"); // Get rid of this if not used elsewhere
	calcBtn.addEventListener("click", startProcess);

	let addActingBtn = document.getElementById("addActingBtn");
    addActingBtn.addEventListener("click", addActingHandler, false);

	let addLwopBtn = document.getElementById("addLwopBtn");
	addLwopBtn.addEventListener("click", addLWoPHandler, false);

	let addOvertimeBtn = document.getElementById("addOvertimeBtn");
	addOvertimeBtn.addEventListener("click", addOvertimeHandler, false);

	let addLumpSumBtn = document.getElementById("addLumpSumBtn");

	addLumpSumBtn.addEventListener("click", addLumpSumHandler, false);

	let addPromotionBtn = document.getElementById("addPromotionBtn");
	addPromotionBtn.addEventListener("click", addPromotionHandler, false);

} // End of setupEventListeners

function main() {
	console.log("Got data:", data);
	console.log("Got i18n: ", i18n);

	lang = document.documentElement.lang;
	console.debug("Got lang " + lang);
	generateAllRates();

	if (dbug) {
		group="IT Group";
		classification = "IT";
		chosenCA = "2021-2025";
		level=0;
		step=0;

		populateGroupSelect ("IT Group");
		populateClassificationSelect("IT");
		populateCASelect("2021-2025");
		generateTables(data.chosenCA());
		populateLevelSelect(0);
		populateStepSelect(0);
	} else {populateGroupSelect ();}


    setupEventListeners();  // Moved all event listener setup to a separate function
} // End of main

if (dbug) console.log ("Finished loading backpayCalc.js.");
main();