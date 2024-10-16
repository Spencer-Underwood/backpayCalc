// Constants

// Else
import {data} from "./raiseInfo.js";
import {i18n} from "./i18n.js";

let dbug = true;
// Collective Agreement variables
let group = null;
let classification = null;
let chosenCA = null;
let CA = null;
let level = -1;
let step = -1;

let lang = "en"

// Helper functions
Date.prototype.toISODateString = function() {
	return this.toISOString().split('T')[0];
};
Date.prototype.toString = function() {
	return this.toISOString();
};

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function createHTMLElement (type, attribs) {
	let newEl = document.createElement(type);
	//This used to use a var mainForm, but I localized it to just access the element directly
	document.getElementById("mainForm").appendChild(newEl);

	let dbug = (arguments.length == 3 &&arguments[2] != null && arguments[2] != false ? true : false);
	for (let k in attribs) {
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
} // End of createHTMLElement



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
		// 			rv = rv.replace(repStr[1], EndDate.toISODateString());
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

function getNum(num) {
	const langFormat = "en-CA";
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

function getStartDate() {
	let startDateTxt = document.getElementById("startDateTxt").value.replace(/[^-\d]/g, "");
	console.debug("getStartDate:: Got startDateTxt:", startDateTxt);

	const date = parseDateString(startDateTxt);
	console.debug("getStartDate:: Parsed date:", date);

	// Add an error if false? // addErrorMessage(startDateTxt.id, getStr("startDateErrorMsg"));
	if (date) { return date; }
	else { return false; }
} // End of getStartDate

function getEndDate() {
	let endDateTxt = document.getElementById("endDateTxt").value.replace(/[^-\d]/g, "");
	const date = parseDateString(endDateTxt);
	console.debug("getStartDate:: Parsed end date:", date);

	// Add an error if false? // addErrorMessage(endDateTxt.id, getStr("endDateErrorMsg"));
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

function isValidDate (d) {
	let rv = false;
	try {
		if (!typeof(d) == "String") d = d.toString();
		let dateRE = /(\d\d\d\d)-(\d\d)-(\d\d)/;
		let dparts = d.match(dateRE);
		d = new Date(dparts[1], dparts[2]-1, dparts[3]);

		if (d >= CA.startDate.getUTCFullYear() && d<= CA.endDate.getUTCFullYear()) rv = true;
	}
	catch (ex) {
		console.error ("Something went wrong: " + ex.toString());
	}
	return rv;
} // End of isValidDate

// Sections Stuff
function handleArguments(args) {
	let settings = { date: null, from: null, to: null, level: null, hours: "", rate: null };

	if (args) {
		settings = {...settings, ...args};
		if (settings.date && !isValidDate(settings.date)) { settings.date = null; }
		if (settings.from && !isValidDate(settings.from)) { settings.from = null; }
		if (settings.to && !isValidDate(settings.to)) { settings.to = null; }
		if (settings.level) { settings.level = settings.level.replace(/\D/g, ""); }
		// Ensure hours is empty string if it fails validation or is not provided
		if (settings.hours) { settings.hours = settings.hours.replace(/\D/g, ""); }
		else { settings.hours = ""; }
	}

	return settings;
}

function addSectionHandler(type, args) {
	const settings = handleArguments(args);
	const containerId = `${type}Div`;
	const containerDiv = document.getElementById(containerId);

	let id = 0;
	while (document.getElementById(`${type}Date${id}`) || document.getElementById(`${type}From${id}`)) { id++;	}

	const addButton = document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
	if (addButton) { addButton.style.display = 'none'; }

	// Create new fieldset within the containerDiv
	const newFS = createHTMLElement("fieldset", { parentNode: containerDiv, class: `fieldHolder ${type}s`, id: `${type}${id}` });
	createHTMLElement("legend", { parentNode: newFS, textNode: `${type.charAt(0).toUpperCase() + type.slice(1)} ${id + 1}` });

	if (type === "lwop") {
		createHTMLElement("label", { parentNode: newFS, for: `${type}From${id}`, textNode: `From date of ${type}: ` });
		createHTMLElement("input", { parentNode: newFS, type: "date", name: `${type}-from-${id}`, id: `${type}From${id}`, "aria-describedby": "dateFormat", value: settings.from });

		createHTMLElement("label", { parentNode: newFS, for: `${type}To${id}`, textNode: `To date of ${type}: ` });
		createHTMLElement("input", { parentNode: newFS, type: "date", name: `${type}-to-${id}`, id: `${type}To${id}`, "aria-describedby": "dateFormat", value: settings.to });
	} else {
		createHTMLElement("label", { parentNode: newFS, for: `${type}Date${id}`, textNode: `Date of ${type}: ` });
		createHTMLElement("input", { parentNode: newFS, type: "date", name: `${type}-date-${id}`, id: `${type}Date${id}`, "aria-describedby": "dateFormat", value: settings.date });

		if (type === "promotion" || type === "acting") {
			createHTMLElement("label", { parentNode: newFS, for: `${type}Level${id}`, textNode: `${type} Level: ` });
			const newSelect = createHTMLElement("select", {parentNode: newFS, name: `${type}-level-${id}`, id: `${type}Level${id}` });
			for (let j = 0; j < CA.levels; j++) {
				const option = createHTMLElement("option", { parentNode: newSelect, value: j, textNode: `${classification} - ${j + 1}` });
				if (settings.level && settings.level == j) option.setAttribute("selected", "selected");
			}
		}

		if (type === "overtime" || type === "lumpsum") {
			createHTMLElement("label", { parentNode: newFS, for: `${type}Amount${id}`, textNode: `Hours-worth of ${type}: ` });
			createHTMLElement("input", { parentNode: newFS, type: "text", name: `${type}-amount-${id}`, id: `${type}Amount${id}`, value: settings.hours });

			if (type === "overtime") {
				createHTMLElement("label", { parentNode: newFS, for: `${type}Rate${id}`, textNode: "Overtime Rate:" });
				const newRateSelect = createHTMLElement("select", { parentNode: newFS, name: `${type}-rate-${id}`, id: `${type}Rate${id}` });
				const rates = { "0": "Select Overtime Rate", "0.125": "1/8x - Standby", "1.0": "1.0", "1.5": "1.5", "2.0": "2.0" };
				for (let r in rates) {
					const rate = createHTMLElement("option", { parentNode: newRateSelect, value: r, textNode: rates[r] });
					if (settings.rate && settings.rate == r) rate.setAttribute("selected", "selected");
				}
			}
		}
	}

	createButtonsDiv(id, newFS, type);
}

function createButtonsDiv(id, parentNode, type) {
	let buttonsDiv = null;
	if (id === 0) {
		buttonsDiv = createHTMLElement("div", { parentNode, id: type + "ButtonsDiv" });
		let newDelBtn = createHTMLElement("input", { parentNode: buttonsDiv, type: "button", value: "Remove", id: "remove" + type + "Btn" + id });
		let newAddBtn = createHTMLElement("input", { parentNode: buttonsDiv, type: "button", value: "Add another " + type, class: type + "Btn", id: "add" + type + "sBtn" + id });
		newAddBtn.addEventListener("click", () => addSectionHandler(type, {}), false);
		newDelBtn.addEventListener("click", (e) => removeSectionDiv(e.target, type), false);
	} else {
		buttonsDiv = document.getElementById(type + "ButtonsDiv");
		parentNode.appendChild(buttonsDiv);
	}
}

function removeSectionDiv(target, type) {
	const sectionElement = target.closest(`.${type}s`);
	if (!sectionElement) return;

	const id = parseInt(sectionElement.id.replace(type, ""), 10);
	let buttonsDiv = document.getElementById(type + "ButtonsDiv");
	let previousSection = null;

	if (id > 0) {
		previousSection = document.getElementById(type + (id - 1));
		if (previousSection) previousSection.appendChild(buttonsDiv);
	}
	sectionElement.parentNode.removeChild(sectionElement);

	// Show the "add period" button again if the last section was removed
	const containerDiv = document.getElementById(`${type}Div`);
	const remainingSections = containerDiv.querySelectorAll(`.fieldHolder.${type}s`).length;
	const addButton = document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}Btn`);
	if (remainingSections === 0 && addButton) { addButton.style.display = 'inline';	}
}


// Dropdown Selectors
function populateGroupSelect (bookmarkGroup = null) {
	// This *should* only ever run once
	let groupSel = document.getElementById("groupSelect");
	for (const group in data) {
		let attributes = { parentNode: groupSel, "textNode": group, value: group};
		if (group === bookmarkGroup) { attributes["selected"] = true; } // Add something for the bookmarks
		createHTMLElement("option", attributes);
	}
} // End of populateGroupSelect

function populateClassificationSelect (bookmarkClassification = null) {
	// When this function is invoked, clear out the dropdown and populate it with the new options.
	let classSel = document.getElementById("classificationSelect");
	classSel.length = 1;
	for (const classifications in data[group]) {
		let attributes = { parentNode: classSel, "textNode": classifications};
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
		let attributes = { parentNode: CASel, "textNode": CA};
		if (CA === bookmarkCA) { attributes["selected"] = true; }
		createHTMLElement("option", attributes);
	}
} // End of populateCASelect

function populateLevelSelect(bookmarkLevel = null){
	let levelSel = document.getElementById("levelSelect");
	levelSel.length = 1;
    for (let i = 0; i < CA.levels; i++) {
		let attributes = {parentNode: levelSel, "textNode": `${classification}-${i + 1}`, value: i};
		if (i === bookmarkLevel) { attributes["selected"] = true; }
		createHTMLElement("option", attributes);
    }
} // End of populateLevelSelect

function populateStepSelect(bookmarkStep = null){
	let stepSel = document.getElementById("stepSelect");
	let steps =  CA.salaries[level];

	for (let i = 0; i < steps.length; i++) {
		let attributes = {parentNode: stepSel, "textNode": `Step ${i+1} - ${ getNum(steps[i]) }`, value: i};
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
		CA = data[group][classification][chosenCA];
		CA.startDate = parseDateString(CA.startDate);
		CA.endDate = parseDateString(CA.endDate);
		CA.levels = CA.salaries.length;

        resetSelectors("CASel");
        populateLevelSelect();

		const levelStartDate = document.getElementById("levelStartDate");
		levelStartDate.setAttribute("datetime", CA.startDate.toISODateString());
		levelStartDate.innerHTML = CA.startDate.toLocaleString("en-CA", { year: 'numeric', month: 'long', day: 'numeric' });

		const calcStartDate = document.getElementById("calcStartDate");
		calcStartDate.setAttribute("datetime", CA.startDate.toISODateString());
		calcStartDate.innerHTML = CA.startDate.toLocaleString("en-CA", { year: 'numeric', month: 'long', day: 'numeric' });

        // generateTables(CA); // TODO: Delete old tables when CA changes
    }, false);

	// TODO: If the level changes we want to change the options in the Step selector, but we also want to keep the date
    let levelSel = document.getElementById("levelSelect");
    levelSel.addEventListener("change", function () {
        level = Number(levelSel.value);
        resetSelectors("levelSel");
        populateStepSelect(step); /* if a step has already been selected, try to use the same step */
    }, false);

	// If the date changes we want to guess their current step
	//document.getElementById("startDateTxt").addEventListener("change", guessStepByStartDate, false);

    let stepSel = document.getElementById("stepSelect");
    stepSel.addEventListener("change", function () {
        step = stepSel.value;
        resetSelectors("stepSel");
    }, false);

	const addActingHandler = (args) => addSectionHandler("acting", args);
	const addLWoPHandler = (args) => addSectionHandler("lwop", args);
	const addOvertimeHandler = (args) => addSectionHandler("overtime", args);
	const addLumpSumHandler = (args) => addSectionHandler("lumpsum", args);
	const addPromotionHandler = (args) => addSectionHandler("promotion", args);

    document.getElementById('addActingBtn').addEventListener('click', () => { addSectionHandler("acting", {}); }, false);
    document.getElementById('addLwopBtn').addEventListener('click', () => { addSectionHandler("lwop", {}); }, false);
    document.getElementById('addOvertimeBtn').addEventListener('click', () => { addSectionHandler("overtime", {}); }, false);
    document.getElementById('addLumpsumBtn').addEventListener('click', () => { addSectionHandler("lumpsum", {}); }, false);
    document.getElementById('addPromotionBtn').addEventListener('click', () => { addSectionHandler("promotion", {}); }, false);

	//document.getElementById("calcBtn").addEventListener("click", startProcess);
} // End of setupEventListeners

function main() {
	console.log("Got data:", data);
	console.log("Got i18n:", i18n);

	lang = document.documentElement.lang;
	console.debug("Got lang:", lang);

	if (dbug === false) {
		populateGroupSelect ();
	} else {
		group="IT Group";
		classification = "IT";
		chosenCA = "2021-2025";
		CA = data[group][classification][chosenCA];
		CA.levels = 5;
		level=0;
		step=0;
		document.getElementById("startDateTxt").value="2022-01-01";

		populateGroupSelect ("IT Group");
		populateClassificationSelect("IT");
		populateCASelect("2021-2025");
		// generateTables(CA);
		populateLevelSelect(0);
		populateStepSelect(0);
	}


    setupEventListeners();  // Moved all event listener setup to a separate function
} // End of main
console.log("Finished loading UI.js.");
main();