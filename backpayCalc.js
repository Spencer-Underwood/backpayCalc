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
var saveValues = null; // This can probably be replaced just by looking the values up at time of save
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


var periods = [];
var lumpSumPeriods = {};
var overtimePeriods = {};


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
var TABegin = new Date("2021", "11", "22");		// Remember months:  0 == Janaury, 1 == Feb, etc.
var EndDate = new Date("2024", "02", "17");		// This is the day after this should stop calculating; same as endDateTxt.value in the HTML
var day = (1000 * 60 * 60 * 24);
var parts = [];



var initPeriods = [];
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

//var days = [31, 29, 31

// #endregion variables

// Helper function to format a Date object to "YYYY-MM-DD".
Date.prototype.toISODateString = function() {
    return this.toISOString().split('T')[0];
};

function oldinit () {
	console.debug("Initting");
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
	// addPromotionBtn = document.getElementById("addPromotionBtn");
	// addActingBtn = document.getElementById("addActingBtn");
	// addOvertimeBtn = document.getElementById("addOvertimeBtn");
	// addLwopBtn = document.getElementById("addLwopBtn");
	// addLumpSumBtn = document.getElementById("addLumpSumBtn");
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
	console.debug("init::MainForm is " + mainForm + ".");
	if (levelSel && stepSel && mainForm && startDateTxt && calcBtn && addActingBtn && addPromotionBtn) {
		console.debug("Adding change event to calcBtn.");
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
		if (i === Number(bookmarkStep) ){
			attributes["selected"] = true;
		}
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
				let levels = CA.salaries.length;
				CA.levels =  levels;
				CA.startDate = parseDateString(CA.startDate);
				CA.endDate = parseDateString(CA.endDate)
				CA.calculatedPeriods = CA.periods;

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
        createHTMLElement("h4", { parentNode: yearSect, textNode: `${getStr("current")} (${CA.startDate.toISOString().slice(0, 10)})` });
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

	console.debug("toCalculate: " + toCalculate + ": " + toCalculate.toString(2) + ".");
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

function guessStepByStartDate () {
	let startDate = getStartDate();
	if ( isNaN(startDate.getTime()) ) {
		console.error("guessStepByStartDate:: Start date isn't a valid date?", startDate);
		return;
	}
	if (isNaN(level) || level < 0 || level > data.chosenCA().levels) {
		console.error("guessStepByStartDate:: Level not selected yet", level);
		return;
	}

	// To get here you must have a valid date and a valid level
	let timeDiff = (data.chosenCA().startDate - startDate) / day;
	let years = Math.floor(timeDiff/365);

	console.debug(`guessStepByStartDate:: TimeDiff between ${data.chosenCA().startDate.toString()} and ${startDate.toString()}: ${timeDiff}`);

	step = 0;
	let calcStartDate = document.getElementById("calcStartDate");
	if (timeDiff < 0) { // You started after the CA started
		calcStartDate.setAttribute("datetime", data.chosenCA().startDate.toISOString().substr(0, 10));
		calcStartDate.innerHTML = startDate.toLocaleString("en-CA", {year: 'numeric', month: 'long', day: 'numeric'});

		step = 1;
	} else { // You started before the CA started
		calcStartDate.setAttribute("datetime", data.chosenCA().startDate.toISOString().substr(0, 10));
		calcStartDate.innerHTML = data.chosenCA().startDate.toLocaleString("en-CA", {year: 'numeric', month: 'long', day: 'numeric'});

		// Ensuring the calculated step does not exceed the number of available steps
		step = Math.min(step+years, data.chosenCA().salaries[level].length);
	}

	document.getElementById("stepSelect").selectedIndex=step+1;
} // End of guessStepByStartDate


function getStartDate() {
	let startDateTxt = document.getElementById("startDateTxt").value.replace(/[^-\d]/g, "");
	console.debug("getStartDate:: Got startDateTxt:", startDateTxt);

	const date = parseDateString(startDateTxt);
	console.debug("getStartDate:: Parsed date:", date);

	// Add an error if false? // addErrorMessage(startDateTxt.id, getStr("startDateErrorMsg"));
	if (date) { return date; }
	else { return false; }
} // End of getStartDate

function parseDateString(dateString) {
	console.debug("parseDateString:: Initial date string:", dateString);

	const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
	console.debug("parseDateString:: Got match:", match);

	if (!match) return false;

	const [_, year, month, day] = match;
	// Create a new Date object based on extracted values
	return new Date(year, month - 1, day);
} // End of parseDateString

function startProcess () {
	// Reset the periods every time pay is calculated
	periods = structuredClone(data.chosenCA().periods);
	// data.chosenCA().calculatedPeriods = structuredClone(data.chosenCA().calculatedPeriods);
	console.log(`startProcess:: Periods being used for "${group}" "${classification}" "${chosenCA}":`, periods);

	saveValues = [];
	lumpSumPeriods = {};
	overtimePeriods = {};

	let resultsBody = document.getElementById("resultsBody");
	let resultsFoot = document.getElementById("resultsFoot");

	if (resultsBody) { removeChildren (resultsBody); } else {
		let resultsTable = document.getElementById("resultsTable");
		createHTMLElement("tbody", {"parentNode":resultsTable, "id":"resultsBody"});
	}
	if (resultsFoot) { removeChildren (resultsFoot); } else {
		let resultsTable = document.getElementById("resultsTable");
		createHTMLElement("tfoot", {"parentNode":resultsTable, "id":"resultsFoot"});
	}

	let errorDivs = document.querySelectorAll(".error");
	if (dbug && errorDivs.length > 0) console.log ("Found " + errorDivs.length + " errorDivs.");
	for (let i = 0; i < errorDivs.length; i++) {
		if (errorDivs[i].hasAttribute("id")) {
			let id = errorDivs[i].getAttribute("id");
			let referrers = document.querySelectorAll("[aria-describedby="+id+"]");
			for (let j = 0; j<referrers.length; j++) {
				if (referrers[j].getAttribute("aria-describedby") == id) {
					referrers[j].removeAttribute("aria-describedby");
				} else {
					referrers[j].setAttribute("aria-describedby", referrers[j].getAttribute("aria-describedby").replace(id, "").replace(/\s+/, " "));
				}
			}
		}
		errorDivs[i].parentNode.removeChild(errorDivs[i]);
	}

	// TODO: Validate Fields *before* calculations
	// validateFields();

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

// getSalary called during startProcess.  "guess" isn't really a good word for this, so I changed it to "get"

// I don't get it.  What's the difference btween selectSalary and getSalary?
// This ones starts: get the CS-0level, get the startDateText date, check for leapyear, set the startDateTxt value, figure out your step, select the step
function getSalary () {
	// TODO: Add error handling. Start Date < End Date, CA / Level / Step all selected
	let CA = data.chosenCA();
	let levelSelect = document.getElementById("levelSelect");

	// TODO: Move this to centralized field validation
	console.debug("getSalary:: Starting level is:", level); // and start date of " + startDate + ".");
	if (level < 0 || level >= CA.levels) {	// Should only happen if someone messes with the querystring
		console.error("getSalary::Error: level is out of bounds.");
		let errDiv = createHTMLElement("div", {"parentNode":levelSelect.parentNode, "id":"levelSelectError", "class":"error"});
		createHTMLElement("span", {"parentNode":errDiv, "nodeText":"Please select a level"});
		levelSelect.setAttribute("aria-describedby", "levelSelectError");
		levelSelect.focus();
		//return; //TODO: cancel processing if level is out of bounds
	} else { saveValues.push("level="+level); }

	let endDateText = document.getElementById("endDateTxt").value;
	let endDate = parseDateString(endDateText);
	let startDate = getStartDate();
	if (level != null && startDate && endDate) {
		console.debug("getSalary::Got valid date, now trying to figure out salary.", startDate);
		let timeDiff = (CA.startDate - startDate) / day;
		console.debug("getSalary:: Step is:", step)

		// TODO: Figure out later if it makes sense to just insert actual date objects here. Later: It does not
		saveValues.push({step:step});
		saveValues.push({startDate: startDate});
		saveValues.push({endDate: endDate});

		//This used to be below adding anniversaries, but some anniversaries were being missed
		console.debug("getSalary::About to set endDate to:", endDate);
		addPeriod ({"date" : endDate.toISOString().substr(0, 10), "type":"End"});

		//add anniversary's
		//dbug = true;
		let startYear = Math.max(CA.startDate.getFullYear(), startDate.getFullYear());
		let stp = step;
		console.debug("getSalary::Going to set anniversary dates betwixt: " + startYear + " and " + endDate.getFullYear() + ".");
		for (let i = startYear; i <=endDate.getFullYear(); i++) {
			if (stp <= CA.salaries[level].length) {
				let anniversaryDate = new Date(i, startDate.getMonth(), startDate.getDate() );
				console.debug("getSalary::Going to set anniversary date " + anniversaryDate + ".");
				if (anniversaryDate > startDate) {
					console.debug("getSalary::Going to add anniversary on " + anniversaryDate + " because it's past " + startDate.toISODateString() + ".");
					addPeriod ({"date": anniversaryDate.toISODateString(), "type":"Anniversary Increase"});
					stp++;
				} else {
					console.debug("getSalary::Not going to add anniversary on " + anniversaryDate + " because it's too early.");
				}
			}
		}
		//dbug = false;
		if (timeDiff < 0) {
			console.debug("getSalary::You weren't even there then.");
			// TODO: consider what to do with pre-start work periods
			// remove all older periods?? Maybe?  Or just somehow make them 0s?
			// This one makes the multipliers 0.
			addPeriod ({"date" : startDate.toISODateString(), "type":"Starting"});
			for (let i = 0; i < periods.length; i++) {
				if (startDate.toISODateString() > periods[i]["date"]){ periods[i]["multiplier"] = 0; }
			}
			
			// This one removes the ones before start date.
			// This _sounds_ good, but it totally messes up the compounding raises later.
			/*
			addPeriod ({"startDate" : startDate.toISOString().substr(0,10), "increase":0, "type":"Starting", "multiplier":1});
			do {
				periods.shift();
			} while (periods[0]["startDate"] <= startDate.toISOString().substr(0,10) && periods[0]["type"] != "Starting");
			*/
			//for (var i = periods.length-1; i >=0; i--)
			/*
			console.debug("getSalary::From step " + step + ".");
			step = step - startYear - EndDate.getFullYear();
			console.debug("getSalary::to step " + step + ".");
			*/
		} else {
			//var salary = salaries[level][step];
			//console.debug("You were there at that point, and your salary would be $" + salary.toFixed(2) + ".");
		}
		if (dbug) {
			console.log("getSalary::pre-calc checks:");
			for (let i = 0; i < periods.length; i++) {
				console.log (`getSalary::${periods[i]["type"]}: ${periods[i]["date"]}`);
			}
		}

	} else {
		console.debug("getSalary::Something's not valid.  Lvl: " + level + ", startDate: " + startDate + ".");
		addStartDateErrorMessage();
	}
} // End of getSalary

function addPromotions () {
	let CA = data.chosenCA();
	// Add promotions
	let promotions = document.querySelectorAll(".promotions");
	let numOfPromotions = promotions.length;
	console.debug("addPromotions::Checking for " + numOfPromotions + " promotions.");
	for (let i = 0; i < promotions.length; i++) {
		let promoLevel = promotions[i].getElementsByTagName("select")[0].value;
		console.debug("addPromotions::promoLevel " + i + ": " + promoLevel + ".");
		// TODO: Why not just parse as date
		// let promoDate_old  = promotions[i].getElementsByTagName("input")[0].value.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
		let promotionDate = new Date(promotions[i].getElementsByTagName("input")[0].value);
		console.debug("addPromotions::promoDate " + i + ": " + promotionDate + ".");
		if (promotionDate) {
			if (promotionDate > CA.startDate && promotionDate < CA.endDate && promoLevel > 0 && promoLevel < CA.levels ) {
				console.debug("addPromotions::Adding a promotion on " + promotionDate + " at level " + promoLevel +".");
				// add the promo period
				let j = addPeriod ({"date":promotionDate.toISODateString(),"type":"promotion", "level":promoLevel});
				// remove future anniversaries
				// TODO: Does this delete past anniversary increases too?
				for (let k = j; k < periods.length; k++) {
					if (periods[k]["type"] === "Anniversary Increase") {
						periods.splice(k, 1);
					}
				}
				// TODO: Consider extracting anniversaries into another function, it's used in multiple places
				// add anniversaries
				let k = promotionDate.getFullYear()+1;
				console.debug("addPromotions::Starting with promo anniversaries k: " + k + ", and make sure it's <= " + EndDate.getFullYear() + ".");
				for (k; k <= EndDate.getFullYear(); k++) {
					let tempDate = new Date (promotionDate);
					tempDate.setFullYear(k);
					console.debug(`addPromotions::Adding anniversary date ${tempDate}.`);
					addPeriod ({"date": tempDate.toISODateString(), "increase":0, "type":"Anniversary Increase", "multiplier":1});
				}
				saveValues.push("pdate" + i + "=" + promotionDate.toISODateString());
				saveValues.push("plvl" + i + "=" + promoLevel);

			} else {
				if (dbug) {
					if (promotionDate > CA.startDate) console.log ("addPromotions::It's after the beginning.");
					if (promotionDate < CA.endDate) console.log ("addPromotions::It's before the end.");
					if (promoLevel > 0) console.log ("addPromotions::It's greater than 0.");
					if (promoLevel < 5) console.log ("addPromotions::It's less than or equal to 5.");
				}
			}
		} else {
			console.debug("addPromotions::Didn't get promoDate.");
		}
	}
	console.log("Breakpoint");
} // End of addPromotions

function getActings () {
	// Add actings
	var actingStints = document.querySelectorAll(".actingStints");
	console.debug("getActings::Dealing with " + actingStints.length + " acting stints.");

	for (var i =0; i < actings; i++) {
		var actingLvl = actingStints[i].getElementsByTagName("select")[0].value;
		var dates = actingStints[i].getElementsByTagName("input");
		var actingFromDate = dates[0].value;
		var actingToDate = dates[1].value;
		console.debug("getActings::Checking acting at " + actingLvl + " from " + actingFromDate + " to " + actingToDate + ".");
		if (actingLvl >=0 && actingLvl <5 && actingFromDate.match(/\d\d\d\d-\d\d-\d\d/) && actingToDate.match(/\d\d\d\d-\d\d-\d\d/)) {
			console.debug("getActings::Passed the initial tests.");
			if (actingFromDate <= EndDate.toISOString().substr(0, 10) && actingToDate >= TABegin.toISOString().substr(0,10) && actingToDate > actingFromDate) {
				if (actingFromDate < TABegin.toISOString().substr(0,10) && actingToDate >= TABegin.toISOString().substr(0,10)) actingFromDate = TABegin.toISOString().substr(0,10);
				console.debug("getActings::And the dates are in the right range.");
				// add a period for starting
				var from = addPeriod({"startDate":actingFromDate, "increase":0, "type":"Acting Start", "multiplier":1, "level":(actingLvl-1)});

				// add a period for returning
				var toParts = actingToDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
				actingToDate = new Date(toParts[1], (toParts[2]-1), toParts[3]);
				actingToDate.setDate(actingToDate.getDate() + parseInt(1));
				var to = addPeriod({"startDate":actingToDate.toISOString().substr(0, 10), "increase":0, "type":"Acting Finished", "multiplier":1});
				var fromParts = actingFromDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
				actingFromDate = new Date(fromParts[1], (fromParts[2]-1), fromParts[3]);
				
				for (var j = parseInt(fromParts[1])+1; j < toParts[1]; j++) {
					if (j + "-" + fromParts[2] + "-" + fromParts[3] < actingToDate.toISOString().substr(0, 10)) {
						addPeriod({"startDate":j + "-" + fromParts[2] + "-" + fromParts[3], "increase":0, "type":"Acting Anniversary", "multiplier":1});
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
	console.debug("Dealing with " + lwopStints.length + " lwops.");
	
	for (var i =0; i < lwopStints.length; i++) {
		var dates = lwopStints[i].getElementsByTagName("input");
		var lwopFromDate = dates[0].value;
		var lwopToDate = dates[1].value;
		if (lwopFromDate.match(/\d\d\d\d-\d\d-\d\d/) && lwopToDate.match(/\d\d\d\d-\d\d-\d\d/)) {
			console.debug("getLWoPs::Passed the initial tests for " + lwopFromDate + " to " + lwopToDate + ".");
			if (lwopFromDate <= EndDate.toISOString().substr(0, 10) && 
					lwopToDate >= TABegin.toISOString().substr(0,10) && 
					lwopToDate > lwopFromDate) {
				if (lwopFromDate <= TABegin.toISOString().substr(0, 10) && lwopToDate >= TABegin.toISOString().substr(0,10)) lwopFromDate = TABegin.toISOString().substr(0, 10);
				if (lwopFromDate <= EndDate.toISOString().substr(0, 10) && lwopToDate > EndDate.toISOString().substr(0, 10)) lwopToDate = EndDate.toISOString().substr(0, 10);
				console.debug("getLWoPs::And the dates are in the right range.");
				// add a period for starting
				var from = addPeriod({"startDate":lwopFromDate, "increase":0, "type":"LWoP Start", "multiplier":0});

				// add a period for returning
				var toParts = lwopToDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
				lwopToDate = new Date(toParts[1], (toParts[2]-1), toParts[3]);
				lwopToDate.setDate(lwopToDate.getDate() + parseInt(1));
				var to = addPeriod({"startDate":lwopToDate.toISOString().substr(0, 10), "increase":0, "type":"LWoP Finished", "multiplier":1});
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
	console.debug("overtimes::Dealing with " + overtimeStints.length + " overtimes.");
	
	for (var i =0; i < overtimeStints.length; i++) {
		var overtimeDate = overtimeStints[i].querySelector("input[type=date]").value;
		var overtimeAmount = overtimeStints[i].querySelector("input[type=text]").value.replace(/[^\d\.]/, "");
		var overtimeRate = overtimeStints[i].querySelector("select").value;
		if (overtimeDate.match(/\d\d\d\d-\d\d-\d\d/)) {
			console.debug("Passed the initial tests.");
			if (overtimeDate >= TABegin.toISOString().substr(0,10) && overtimeDate <= EndDate.toISOString().substr(0, 10) && overtimeAmount > 0) {
				console.debug("overtimes::And the dates are in the right range.");
				// add a period for starting
				
				var from = addPeriod({"startDate":overtimeDate, "increase":0, "type":"Overtime", "multiplier":0, "hours":overtimeAmount, "rate":overtimeRate});
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
	console.debug("Dealing with " + lumpsums.length + " lumpsums.");
	
	for (var i =0; i < lumpsums.length; i++) {
		var lumpSumDate = lumpsums[i].querySelector("input[type=date]").value;
		var lumpSumAmount = lumpsums[i].querySelector("input[type=text]").value.replace(/[^\d\.]/, "");
		if (lumpSumDate.match(/\d\d\d\d-\d\d-\d\d/)) {
			console.debug("Passed the initial tests.");
			if (lumpSumDate >= TABegin.toISOString().substr(0,10) && lumpSumDate <= EndDate.toISOString().substr(0, 10) && lumpSumAmount > 0) {
				console.debug("And the dates are in the right range.");
				// add a period for starting
				var from = addPeriod({"startDate":lumpSumDate, "increase":0, "type":"Lump Sum", "multiplier":0, "hours":lumpSumAmount});

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

function addPeriod (p) {
	let rv = null;
	if (p["type"] === "End") {
		console.log(`addPeriod:: Adding end period (${p.date}) to end of periods (${periods.length}).`);
		periods.push(p);
		return;
	}
	if (p.startDate instanceof Date) {
		console.debug(`addPeriod:: startDate (${p.date}) was Date object, converting to string`);
		p.startDate = p.startDate.toISOString();
	}
	if (p.startDate < periods[0]["date"]) {
		console.error(`addPeriod:: Period with a starting date of ${p.date} is before the starting date ${periods[0]["date"]}!`)
		return;
	}

	console.debug(`addPeriod:: Gonna add period beginning at ${p["date"]} to periods ${periods.length}.`);
	let looking = true;
	if (p["date"] === periods[0]["date"]) {
		if (p["type"] === "Anniversary Increase") {
			periods[0]["type"] += " & " + p["type"];
			looking = false;
			console.debug("addPeriod::Not gonna add this period because the anniversary date is the same as the first date of the CA.");
		}
	}
	if (p["type"] === "Anniversary Increase") {
		if (looking) { console.debug("addPeriod:: Gonna start looking for the place to insert this anniversary increase.") }
		else { console.debug("addPeriod:: Would look for the anniversary but looking is false."); }
	}
	for (let i = 1; i < periods.length && looking; i++) {
		if (p["date"] < periods[i]["date"]) {
			console.debug(`addPeriod:: [${i}] it is!`);
			if (p["type"] === "Lump Sum") {
				if (lumpSumPeriods.hasOwnProperty(periods["date"])) {
					lumpSumPeriods[periods[i - 1]["date"]] += p["hours"];
					console.debug("Adding lump sum amount to " + periods[i - 1]["date"] + " of " + p["hours"] + ".");
				} else {
					lumpSumPeriods[periods[i - 1]["date"]] = p["hours"];
					console.debug("Adding lump sum amount for " + periods[i - 1]["date"] + " of " + p["hours"] + ".");
				}
				looking = false;
			} else if (p["type"] === "Overtime") {
				//dbug = true;
				console.debug("Does overtimePeriods have anything in " + periods[i - 1]["date"] + "?");
				if (overtimePeriods.hasOwnProperty(periods[i - 1]["date"])) {
					console.debug("Yes.  But does it have anything in rate: " + p["rate"] + "?");
					if (overtimePeriods[periods[i - 1]["date"]].hasOwnProperty(p["rate"])) {
						console.debug("Yup.  So gonna add " + periods[i - 1]["date"][p["rate"]] + " to " + p["hours"] + ".");
						overtimePeriods[periods[i - 1]["date"]][p["rate"]] = (overtimePeriods[periods[i - 1]["date"]][p["rate"]] * 1) + (p["hours"] * 1);
						console.debug("Adding overtime amount to " + periods[i - 1]["date"] + " of " + p["hours"] + " x " + p["rate"] + ".");
						console.debug("And it came to " + overtimePeriods[periods[i - 1]["date"]][p["rate"]] + ".");
					} else {
						console.debug("No, so gonna set amount " + p["hours"] + " to " + periods[i - 1]["date"][p["rate"]] + ".");
						overtimePeriods[periods[i - 1]["date"]][p["rate"]] = p["hours"];
						console.debug("Adding overtime amount for " + periods[i - 1]["date"] + " of " + p["hours"] + " x " + p["rate"] + " to equal " + overtimePeriods[periods[i - 1]["date"]][p["rate"]] + " which should be " + p["hours"] + ".");
					}
				} else {
					console.debug("No.  So gonna add one.");
					console.debug("addPeriod::p[rate]: " + p["rate"] + ".");
					console.debug("addPeriod::p[hours]: " + p["hours"] + ".");
					overtimePeriods[periods[i - 1]["date"]] = {};
					overtimePeriods[periods[i - 1]["date"]][p["rate"]] = p["hours"];
					console.debug("addPeriod::Now in " + periods[i - 1]["date"] + " at rate of " + p["rate"] + ": " + overtimePeriods[periods[i - 1]["date"]][p["rate"]] + ".");
				}
				looking = false;
				//dbug = false;
			} else {
				// Handles everything but overtime and OT?
				console.debug(`addPeriod:: Adding period for type "${p["type"]}" from: ${p["date"]}.`);
				periods.splice(i, 0, p);
				rv = i;
				looking = false;
				if (p["type"] === "End") {
					console.error(`addPeriod:: invalid state, type == end should've been caught earlier`)
					periods.splice(i + 1);
					rv = periods.length - 1;
				}
			}
		}
		else if (p["date"] === periods[i]["date"]) {
			console.debug("addPeriod::["+i+"] Period date matches starting date!");
			if (p["type"] === "Phoenix") {
				periods[i]["type"] += " & Phoenix";
				looking = false;
				rv = i;
			} else if (p["type"] === "Anniversary Increase" && periods[i]["type"].match(/Contractual/)) {
				periods[i]["type"] += " & Anniversary Increase";
				looking = false;
				rv = i;
			}
		} else {
			//if (/*p["type"] == "Anniversary Increase" && */dbug) console.log ("addPeriod::["+i+"]It's after.");
		}
	}
	return rv;
} // End of addPeriod

function calculate() {
	resultStatus.innerHTML="";
	//if (step == salaries[level].length -1) {
		//console.debug("Top of your level.  This should be easy.");
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
				console.log (periods[i]["type"] + ": " + periods[i]["date"] + ".");
			}
		}
		for (let i = 0; i < periods.length-1; i++) {
			console.debug(i + ": " + periods[i]["startDate"] + ":");
			console.debug(i + ": going between " + periods[i]["startDate"] + " and " + periods[i+1]["startDate"] + " for the type of " + periods[i]["type"] + ".");
			if (periods[i]["type"].match(/Anniversary Increase/)) {
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
				console.debug(output);
			} else if (periods[i]["type"] == "Acting Anniversary") {
				var output = "Increasing step from " + step + " to ";
				step = Math.min(step + 1, salaries[level].length-1);
				output += step + "."
				console.debug(output);
			} else if (periods[i]["type"] == "promotion") {
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
			} else if (periods[i]["type"] == "Acting Start") {
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

			} else if (periods[i]["type"] == "Acting Finished") {
				var orig = actingStack.pop();
				step = orig["step"];
				level = orig["level"];
			}
			periods[i]["made"] = 0;
			periods[i]["shouldHaveMade"] = 0;
			periods[i]["backpay"] = 0;
			multiplier =(1 + (periods[i]["increase"]/100));
			console.debug("Multiplier: " + multiplier + ".");
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
				console.debug("Your annual salary went from " + salaries[level][step] + " to " + newSalaries[level][step] + ".");
			}
			var days = 0;
			if (step >= 0) {
				console.debug("current period: periods[" + i + "][startDate]: " + periods[i]["startDate"] + ".");
				console.debug("future period: periods[" + (i+1) + "][startDate]: " + periods[(i+1)]["startDate"] + ".");
				var dparts = periods[i]["startDate"].match(/(\d\d\d\d)-(\d\d?)-(\d\d?)/);
				var current = new Date(dparts[1], dparts[2]-1, dparts[3]);
				parts = periods[i+1]["startDate"].match(/(\d\d\d\d)-(\d\d?)-(\d\d?)/);
				var future = new Date(parts[1], parts[2]-1, parts[3]);
				//future.setDate(future.getDate() - 1);
				var diff = (future  - current) / day;
				console.debug("There were " + diff + " days between " + current.getFullYear() + "-" +  (current.getMonth()+1) +"-" + current.getDate() + " and " + future.getFullYear() + "-" + (future.getMonth()+1) + "-" + future.getDate() +".");
				while (current < future) {
					//console.debug("Now calculating for day " + current.toString() + ".");
					if (current.getDay() > 0 && current.getDay() < 6) {	// don't calculate weekends
						days++;
						periods[i]["made"] = periods[i]["made"] + daily[level][step] * periods[i]["multiplier"];	// multiplier is if you were there then or not.
						periods[i]["shouldHaveMade"] = (periods[i]["shouldHaveMade"] + (newDaily[level][step] * periods[i]["multiplier"]));
					}
					current.setDate(current.getDate() + parseInt(1));
		//			//console.debug("Now day is " + current.toString() + ".");
				}
			} else {
				console.debug(periods[i]["startDate"] + ": Step is still " + step + " therefore, not adding anything to made.");
			}
			periods[i]["backpay"] = periods[i]["shouldHaveMade"] - periods[i]["made"];

			var newTR = createHTMLElement("tr", {"parentNode":resultsBody});
			let endDate = new Date(periods[i+1]["startDate"]);
			endDate.setDate(endDate.getDate() -1);
			var newPaidTD = createHTMLElement("td", {"parentNode":newTR, "textNode": periods[i]["startDate"] + " - " + endDate.toISOString().substr(0,10)});
			var reasonDiv = createHTMLElement("div", {"parentNode":newPaidTD, "textNode":"(" + periods[i]["type"] + ")", "class":"small"});
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
				console.debug("Yup there are OT for " + periods[i]["startDate"] + ".");
				for (var rate in overtimePeriods[periods[i]["startDate"]]) {
					console.debug("rate: " + rate + ".");
					console.debug("amount: " + overtimePeriods[periods[i]["startDate"]][rate] + ".");
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
				console.debug("Nope, there aren't OT for " + periods[i]["startDate"] + ".");
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
		//console.debug("Not the top of your level.  This should be difficult.");
		

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
	console.debug("Error:  st is " + startDateTxt.value + ".");
	var errDiv = createHTMLElement("div", {"parentNode":startDateTxt.parentNode, "id":"startDateError", "class":"error"});
	createHTMLElement("p", {"parentNode":errDiv, "nodeText":"Please enter the date at which you started at the level you were at on December 22, 2018. If you weren't a CS at that time, enter the date you started as a CS.  All dates must be in the format of YYYY-MM-DD."});
	levelSel.setAttribute("aria-describedby", "startDateError");
	return;
}

let formatter = new Intl.NumberFormat('en-CA', {
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
		console.debug("Dealing with attrib " + k + ".");
		if (k == "parentNode") {
			console.debug("Dealing with parentnode.");
			if (attribs[k] instanceof HTMLElement) {
				console.debug("Appending...");
				attribs[k].appendChild(newEl);
			} else if (attribs[k] instanceof String || typeof(attribs[k]) === "string") {
				try {
					console.debug("Getting, then appending...");
					document.getElementById(attribs[k]).appendChild(newEl);
				}
				catch (er) {
					console.error("Error creating HTML Element: " + er.message + ".");
				}
			}
		} else if (k == "textNode" || k == "nodeText") {
			console.debug("Dealing with textnode " + attribs[k] + ".");
			if (typeof (attribs[k]) == "string") {
				console.debug("As string...");
				newEl.appendChild(document.createTextNode(attribs[k]));
			} else if (attribs[k] instanceof HTMLElement) {
				console.debug("As HTML element...");
				newEl.appendChild(attribs[k]);
			} else {
				console.debug("As something else...");
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

// #region events

function addPromotionHandler() {
	if (data.chosenCA() == null) {console.error("addPromotionHandler:: Attempted to update promotion selectors without choosing a collective agreement first"); return; }
	let toFocus = true;
	let pdate = null;
	let plvl = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		console.debug("addPromotionHandler::arguments: " + arguments.length);
		if (args.hasOwnProperty("toFocus")) toFocus = args["toFocus"];
		if (args.hasOwnProperty("date")) {
			pdate = (isValidDate(args["date"]) ? args["date"] : null);
		}
		if (args.hasOwnProperty("level")) {
			plvl = args["level"].replaceAll(/\D/g, "");
			plvl = (plvl > 0 && plvl < 6 ? plvl : null);
		}
		console.debug(`addPromotionHandler::toFocus: ${toFocus}, pdate: ${pdate}, plvl: ${plvl}.`);
	}
	let promotionsDiv = document.getElementById("promotionsDiv");

	// Find the next available promotion ID by extracting the highest current ID and incrementing it.

	let id = 0;
	while (document.getElementById("promo" + id)) { id++; }

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

function addActingHandler () {
	if (data.chosenCA() == null) {console.error("addActingHandler:: Attempted to update acting selector without choosing a collective agreement first"); return; }

	let toFocus = true;
	let afdate = null;
	let atdate = null;
	let alvl = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		console.debug("addActingHandler::arguments: " + arguments.length);
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
		console.debug(`addActingHandler::toFocus: ${toFocus}, from: ${afdate} to ${atdate}, alvl: ${alvl}.`);
	}

	let actingsDiv = document.getElementById("actingsDiv");

	let id = 0;
	while (document.getElementById("actingLevel"+id) ) { id++; }

	let newActingFS = createHTMLElement("fieldset", {"parentNode":actingsDiv, "class":"fieldHolder actingStints", "id":"acting"+id});
	createHTMLElement("legend", {"parentNode":newActingFS, "textNode":"Acting Stint " + (id+1)});

	createHTMLElement("label", {"parentNode":newActingFS, "textNode":"From", "for":"actingFrom" + id});
	let newActingFromDate = createHTMLElement("input", {"parentNode":newActingFS, "id":"actingFrom"+id, "type":"date", "aria-describedby":"dateFormat", "value":(afdate ? afdate : null)});
	createHTMLElement("label", {"parentNode":newActingFS, "textNode":"To", "for":"actingTo"+id});
	createHTMLElement("input", {"parentNode":newActingFS, "id":"actingTo"+id, "type":"date", "aria-describedby":"dateFormat", "value":(atdate ? atdate : null)});

	createHTMLElement("label", {"parentNode":newActingFS, "for":"actingLevel" + id, "nodeText":"Acting Level: "});
	let newActingSel = createHTMLElement("select", {"parentNode":newActingFS, "id":"actingLevel" + id});

	for (let j = 0; j < data.chosenCA().levels; j++) {
		let newPromoOpt = createHTMLElement("option", {"parentNode":newActingSel, "value": j, "nodeText":classification + " - " + (j +1) });
		if (alvl) {
			if (alvl === j) newPromoOpt.setAttribute("selected", "selected");
		} else {
			if (level+1 === j) newPromoOpt.setAttribute("selected", "selected");
		}
	}

	let actingButtonsDiv = null;
	if (id === 0) {
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

	resultStatus.innerHTML="New Acting section added.";
} // End of addActingHandler

function addLWoPHandler () {
	let toFocus = true;
	let lfrom = null;
	let lto = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		console.debug("addLWoPHandler::arguments: " + arguments.length);
		if (args.hasOwnProperty("toFocus")) toFocus = args["toFocus"];
		if (args.hasOwnProperty("from")) {
			lfrom = (isValidDate(args["from"]) ? args["from"] : null);
		}
		if (args.hasOwnProperty("to")) {
			lto = (isValidDate(args["to"]) ? args["to"] : null);
		}
		console.debug(`addLWoPHandler::toFocus: ${toFocus}, from: ${lfrom} to ${lto}.`);
	}

	var LWoPDiv = document.getElementById("LWoPDiv");

	let id = 0;
	while (document.getElementById("lwopFrom"+id) ) { id++; }

	let newLWoPFS = createHTMLElement("fieldset", {"parentNode":LWoPDiv, "class":"fieldHolder lwopStints", "id":"lwop"+id});
	createHTMLElement("legend", {"parentNode":newLWoPFS, "textNode":"LWoP Stint " + (id+1)});

	createHTMLElement("label", {"parentNode":newLWoPFS, "textNode":"From", "for":"lwopFrom" + id});
	let newLWoPFromDate = createHTMLElement("input", {"parentNode":newLWoPFS, "id":"lwopFrom"+id, "type":"date", "aria-describedby":"dateFormat", "value":(lfrom ? lfrom : null)});
	createHTMLElement("label", {"parentNode":newLWoPFS, "textNode":"To", "for":"lwopTo"+id});
	let newLWoPToDate = createHTMLElement("input", {"parentNode":newLWoPFS, "id":"lwopTo"+id, "type":"date", "aria-describedby":"dateFormat", "value" : (lto ? lto : null)});

	let lwopButtonsDiv = null;
	if (id === 0) {
		lwopButtonsDiv = createHTMLElement("div", {"parentNode":newLWoPFS, "id":"lwopButtonsDiv"});
		var newDelLWoPBtn = createHTMLElement("input", {"parentNode":lwopButtonsDiv, "type":"button", "value":"Remove", "id": "removeLWoPBtn" + lwops});
		var newAddLWoPBtn = createHTMLElement("input", {"parentNode":lwopButtonsDiv, "type":"button", "value":"Add another LWoP", "class":"lwopBtn", "id": "addLWoPsBtn" + id});
		newAddLWoPBtn.addEventListener("click", addLWoPHandler, false);
		newDelLWoPBtn.addEventListener("click", removeLWoPDiv, false);
	} else {
		lwopButtonsDiv = document.getElementById("lwopButtonsDiv");
		newLWoPFS.appendChild(lwopButtonsDiv);
	}

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
		console.debug("addOvertimeHandler::arguments: " + arguments.length);
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
		console.debug(`addOvertimeHandler::toFocus: ${toFocus}, date: ${otdate} hours ${othours}, rate: ${otrate}.`);
	}

	let OvertimeDiv = document.getElementById("overtimeDiv");

	let id = 0;
	while (document.getElementById("overtimeDate"+id) ) { id++; }

	let newOvertimeFS = createHTMLElement("fieldset", {"parentNode":OvertimeDiv, "class":"fieldHolder overtimes", "id":"ot" + id});
	createHTMLElement("legend", {"parentNode":newOvertimeFS, "textNode":"Overtime or Standby " + (id+1)});

	let newDateFieldHolder = createHTMLElement("div", {"parentNode":newOvertimeFS, "class":"fieldHolder"});
	createHTMLElement("label", {"parentNode":newDateFieldHolder, "textNode":"Date of Overtime:", "for":"overtimeDate" + id});
	let newOvertimeDate = createHTMLElement("input", {"parentNode":newDateFieldHolder, "id":"overtimeDate"+id, "type":"date", "aria-describedby":"dateFormat", "value":(otdate ? otdate : null)});


	let newAmountFieldHolder = createHTMLElement("div", {"parentNode":newOvertimeFS, "class":"fieldHolder"});
	createHTMLElement("label", {"parentNode":newAmountFieldHolder, "textNode":"Hours-worth of overtime", "for":"overtimeAmount" + id});
	createHTMLElement("input", {"parentNode":newAmountFieldHolder, "id":"overtimeAmount"+id, "type":"text", "value" : (othours ? othours : null)});

	createHTMLElement("div", {"parentNode":newOvertimeFS, "class":"fieldHolder"});
	createHTMLElement("label", {"parentNode":newAmountFieldHolder, "textNode":"Overtime Rate:", "for":"overtimeRate" + id});
	let newOvertimeRate = createHTMLElement("select", {"parentNode":newAmountFieldHolder, "id":"overtimeRate"+id});
	let rates = {"0" : "Select Overtime Rate", "0.125" : "1/8x - Standby", "1.0" : "1.0", "1.5" : "1.5", "2.0": "2.0"};
	createHTMLElement("option", {"parentNode":newOvertimeRate, "value":"0", "nodeText":"Select Overtime Rate"});

	for (let r in rates) {
		let rt = createHTMLElement("option", {"parentNode":newOvertimeRate, "value":r, "nodeText": rates[r]});
		if (otrate && otrate == r) rt.setAttribute("selected", "selected");
	}


	let otButtonsDiv = null;
	if (id === 0) {
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

	resultStatus.innerHTML="New overtime section added.";
} // End of addOvertimeHandler

function addLumpSumHandler () {
	let toFocus = true;
	let lsdate = null;
	let lshours = null;
	if (arguments.length > 1) {
		let args = arguments[1];
		console.debug("addLumpSumHandler::arguments: " + arguments.length);
		if (args.hasOwnProperty("toFocus")) toFocus = args["toFocus"];
		if (args.hasOwnProperty("date")) {
			lsdate = (isValidDate(args["date"]) ? args["date"] : null);
		}
		if (args.hasOwnProperty("hours")) {
			lshours = (args["hours"] ? args["hours"] : null);
		}
		console.debug(`addLumpSumHandler::toFocus: ${toFocus}, date: ${lsdate} hours ${lshours}.`);
	}

	let LumpSumDiv = document.getElementById("lumpSumDiv");

	let id = 0;
	while (document.getElementById("lumpSumDate"+id) ) { id++; }

	let newLumpSumFS = createHTMLElement("fieldset", {"parentNode":LumpSumDiv, "class":"fieldHolder lumpSums", "id":"lumpSum" + id});
	createHTMLElement("legend", {"parentNode":newLumpSumFS, "textNode":"Lump Sum " + (id+1)});

	let newDateFieldHolder = createHTMLElement("div", {"parentNode":newLumpSumFS, "class":"fieldHolder"});
	createHTMLElement("label", {"parentNode":newDateFieldHolder, "textNode":"Date paid out:", "for":"lumpSumDate" + id});
	let newLumpSumDate = createHTMLElement("input", {"parentNode":newDateFieldHolder, "id":"lumpSumDate"+id, "type":"date", "aria-describedby":"dateFormat", "value" : (lsdate ? lsdate : null)});

	let newAmountFieldHolder = createHTMLElement("div", {"parentNode":newLumpSumFS, "class":"fieldHolder"});
	createHTMLElement("label", {"parentNode":newAmountFieldHolder, "textNode":"Hours-worth of payout", "for":"lumpSumAmount" + id});
	let newLumpSumAmount = createHTMLElement("input", {"parentNode":newAmountFieldHolder, "id":"lumpSumAmount"+id, "type":"text", "value" : (lshours ? lshours : "")});


	let lumpSumButtonsDiv = null;
	if (id === 0) {
		lumpSumButtonsDiv = createHTMLElement("div", {"parentNode":newLumpSumFS, "id":"lumpSumButtonsDiv"});
		let newDelLumpSumBtn = createHTMLElement("input", {"parentNode":lumpSumButtonsDiv, "type":"button", "value":"Remove", "id": "removeLumpSumBtn" + lumpSums});
		let newAddLumpSumBtn = createHTMLElement("input", {"parentNode":lumpSumButtonsDiv, "type":"button", "value":"Add another LumpSum", "class":"lumpSumBtn", "id": "addLumpSumsBtn" + id});
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
	resultStatus.innerHTML="New lump sum section added.";
} // End of addLumpSum Handler

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

function removeActingDiv (e) {
	let actingFS = null;
	let actingFromDate = null;
	let actingButtonsDiv =  document.getElementById("actingButtonsDiv");

	let actingText = e.target.closest(".actingStints").id;
	let actings = Number(actingText.replace("acting",""));
	let rmActingFS = document.getElementById("acting" + actings);

	if (actings === 0) {
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
	let lwopButtonsDiv = document.getElementById("lwopButtonsDiv");
	let lwopFS = null;
	let lwopDate = null;


	let lwopText = e.target.closest(".lwopStints").id;
	let lwops = Number(lwopText.replace("lwop",""));

	let rmLwopFS = document.getElementById("lwop" + lwops);
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
	let otButtonsDiv = document.getElementById("otButtonsDiv");
	let otFS = null;
	let otDate = null;

	let overtimesText = e.target.closest(".overtimes").id;
	let overtimes = Number(overtimesText.replace("ot",""));

	let rmOTFS = document.getElementById("ot" + overtimes);
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

	lumpSumButtonsDiv = document.getElementById("lumpSumButtonsDiv");
	let lumpSumText = e.target.closest(".lumpSums").id;
	let lumpSums = Number(lumpSumText.replace("lumpSum",""));

	let rmLumpSumFS = document.getElementById("lumpSum" + lumpSums);
	if (lumpSums === 0) {
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

		const levelStartDate = document.getElementById("levelStartDate");
		levelStartDate.setAttribute("datetime", data.chosenCA().startDate.toISOString().substr(0,10));
		levelStartDate.innerHTML = data.chosenCA().startDate.toLocaleString("en-CA", { year: 'numeric', month: 'long', day: 'numeric' });
		const calcStartDate = document.getElementById("calcStartDate");
		calcStartDate.setAttribute("datetime", data.chosenCA().startDate.toISOString().substr(0,10));
		calcStartDate.innerHTML = data.chosenCA().startDate.toLocaleString("en-CA", { year: 'numeric', month: 'long', day: 'numeric' });

        generateTables(data.chosenCA()); // TODO: Delete old tables when CA changes
    }, false);

	// TODO: If the level changes we want to change the options in the Step selector, but we also want to keep the date
    let levelSel = document.getElementById("levelSelect");
    levelSel.addEventListener("change", function () {
        level = Number(levelSel.value);
        resetSelectors("levelSel");
        populateStepSelect(step); /* if a step has already been selected, try to use the same step */
    }, false);

	// If the date changes we want to guess their current step
	document.getElementById("startDateTxt").addEventListener("change", guessStepByStartDate, false);

    let stepSel = document.getElementById("stepSelect");
    stepSel.addEventListener("change", function () {
        step = stepSel.value;
        resetSelectors("stepSel");
    }, false);

	document.getElementById("calcBtn").addEventListener("click", startProcess);
	document.getElementById("addActingBtn").addEventListener("click", addActingHandler, false);
	document.getElementById("addLwopBtn").addEventListener("click", addLWoPHandler, false);
	document.getElementById("addOvertimeBtn").addEventListener("click", addOvertimeHandler, false);
	document.getElementById("addLumpSumBtn").addEventListener("click", addLumpSumHandler, false);
	document.getElementById("addPromotionBtn").addEventListener("click", addPromotionHandler, false);
} // End of setupEventListeners

// #endregion events

function main() {
	console.log("Got data:", data);
	console.log("Got i18n:", i18n);

	lang = document.documentElement.lang;
	console.debug("Got lang:", lang);
	generateAllRates();

	if (dbug) {
		group="IT Group";
		classification = "IT";
		chosenCA = "2021-2025";
		level=0;
		step=0;
		document.getElementById("startDateTxt").value="2022-01-01";

		populateGroupSelect ("IT Group");
		populateClassificationSelect("IT");
		populateCASelect("2021-2025");
		generateTables(data.chosenCA());
		populateLevelSelect(0);
		populateStepSelect(0);
	} else {populateGroupSelect ();}


    setupEventListeners();  // Moved all event listener setup to a separate function
} // End of main

console.debug("Finished loading backpayCalc.js.");
main();