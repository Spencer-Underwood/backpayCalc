// Constants

// Else
import {data} from "./raiseInfo.js";
import {i18n} from "./i18n.js";
import {StartProcess} from "./backpayCalc.js";

//#region variables
let dbug = true;
// Collective Agreement variables
let group = null;
let classification = null;
let chosenCA = null;
let CA = null;
let level = -1;
let step = -1;

let lang = "en"
const scriptName = "backpayCalc"
//endregion

//#region Helpers
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
    console.debug(`Creating HTML element of type: ${type} with attributes:`, attribs);

	let dbug = (arguments.length == 3 &&arguments[2] != null && arguments[2] != false ? true : false);
	for (let k in attribs) {
		// console.debug("Dealing with attrib " + k + ".");
		if (k == "parentNode") {
			// console.debug("Dealing with parentnode.");
			if (attribs[k] instanceof HTMLElement) {
				// console.debug("Appending...");
				attribs[k].appendChild(newEl);
			} else if (attribs[k] instanceof String || typeof(attribs[k]) === "string") {
				try {
					// console.debug("Getting, then appending...");
					document.getElementById(attribs[k]).appendChild(newEl);
				}
				catch (er) {
					console.error("Error creating HTML Element: " + er.message + ".");
				}
			}
		} else if (k == "textNode" || k == "nodeText") {
			// console.debug("Dealing with textnode " + attribs[k] + ".");
			if (typeof (attribs[k]) == "string") {
				// console.debug("As string...");
				newEl.appendChild(document.createTextNode(attribs[k]));
			} else if (attribs[k] instanceof HTMLElement) {
				// console.debug("As HTML element...");
				newEl.appendChild(attribs[k]);
			} else {
				// console.debug("As something else...");
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
    // Extract year, month, day directly
    const [year, month, day] = dateString.split('-').map(Number);

    // Create and validate the Date object
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? false : date;
}

//endregion

//#region URL Stuff
function savaDataToURL(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const params = new URLSearchParams();

    // Iterate over the form data and add each field to the URL parameters
    formData.forEach((value, key) => {
        if (value) {params.append(key, value); }
    });
    const encodedParams = decodeURIComponent(params.toString());
    console.log("Generated URL parameters:", params.toString());

    // Update the URL without reloading the page
    let newUrl = `${window.location.pathname}?${params.toString()}`;
    // newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${encodedParams}`;

    console.log(`saveDataToUrl::Setting URL to ${newUrl}`);

    loadDataFromUrl(newUrl);
    window.history.replaceState(null, '', newUrl);
}

function loadDataFromUrl(url = null){
    const queryString = url ? url.split('?')[1] || "" : window.location.search;
    const params = new URLSearchParams(queryString);
    console.debug(`loadDataFromUrl::${queryString}`);

    // Load each field, throwing an error if it doesn't exist
    group = params.get("group");
    classification = params.get("classification");
    chosenCA = params.get("collective-agreement");
    level = params.get("level");
    step = params.get("step");
    let startDate = params.get("start-date");
    let endDate = params.get("end-date");

    if (!(group && classification && chosenCA && level && step && startDate && endDate)) { throw new Error("loadDataFromUrl::Missing critical URL parameter") }
    CA = data[group][classification][chosenCA];

    populateGroupSelect(group);
    populateClassificationSelect(classification);
    populateCASelect(chosenCA);
    populateLevelSelect(parseInt(level));
    populateStepSelect(parseInt(step));
    document.getElementById("startDateTxt").value = startDate;
    document.getElementById("endDateTxt").value = endDate;

    clearDynamicSections(["promotionDiv", "actingDiv", "lwopDiv", "overtimeDiv", "lumpsumDiv"]);

    console.log("loadDataFromUrl::Breakpoint");
}



//endregion URL Stuff

function addSectionHandler(type, args) {
    // Initialize settings with default values for each field (date, from, to, level, hours, rate)
	let settings = { date: null, from: null, to: null, level: null, hours: "", rate: null };
    if (args) {
		// Merge provided arguments into settings, overriding defaults where applicable
        settings = { ...settings, ...args };
		// Inline date validation for settings.date, settings.from, and settings.to
		if (settings.date) {
			const date = new Date(settings.date);
			if (isNaN(date.getTime()) || date < CA.startDate || date > CA.endDate) { settings.date = null; }
		}
		if (settings.from) {
			const fromDate = new Date(settings.from);
			if (isNaN(fromDate.getTime()) || fromDate < CA.startDate || fromDate > CA.endDate) { settings.from = null; }
		}
		if (settings.to) {
			const toDate = new Date(settings.to);
			if (isNaN(toDate.getTime()) || toDate < CA.startDate || toDate > CA.endDate) { settings.to = null; }
		}
        if (settings.level) { settings.level = settings.level.replace(/\D/g, ""); }
        // Ensure hours is an empty string if it fails validation or is not provided
        if (settings.hours) { settings.hours = settings.hours.replace(/\D/g, ""); }
        else { settings.hours = ""; }
    }

    const containerDiv = document.getElementById(`${type}Div`);

    let id = 0;
    while (document.getElementById(`${type}Date${id}`) || document.getElementById(`${type}From${id}`)) { id++; }

    const addButton = document.getElementById(`add${capitalizeFirstLetter(type)}Btn`);
    if (addButton) { addButton.style.display = 'none'; }

    // Create new fieldset within the containerDiv
    const newFS = createHTMLElement("fieldset", { parentNode: containerDiv, class: `fieldHolder ${type}s`, id: `${type}${id}` });
    createHTMLElement("legend", { parentNode: newFS, textNode: `${capitalizeFirstLetter(type)} ${id + 1}` });

    // Internal helper functions for adding fields
    function addInputField(labelText, inputAttributes) {
        createHTMLElement("label", { parentNode: newFS, for: inputAttributes.id, textNode: labelText });
        createHTMLElement("input", { parentNode: newFS, ...inputAttributes });
    }

    function addTwoDateFields() {
        addInputField(`From: `, {
            type: "date",
            name: `${type}-from-${id}`,
            id: `${type}From${id}`,
            "aria-describedby": "dateFormat",
            value: settings.from
        });
        addInputField(`To: `, {
            type: "date",
            name: `${type}-to-${id}`,
            id: `${type}To${id}`,
            "aria-describedby": "dateFormat",
            value: settings.to
        });
    }

    function addDateField() {
        addInputField(`Date of ${type}: `, {
            type: "date",
            name: `${type}-date-${id}`,
            id: `${type}Date${id}`,
            "aria-describedby": "dateFormat",
            value: settings.date
        });
    }

    function addLevelSelect() {
        createHTMLElement("label", { parentNode: newFS, for: `${type}Level${id}`, textNode: `${capitalizeFirstLetter(type)} Level: ` });
        const newSelect = createHTMLElement("select", { parentNode: newFS, name: `${type}-level-${id}`, id: `${type}Level${id}` });

        for (let j = 0; j < CA.levels; j++) {
            const option = createHTMLElement("option", { parentNode: newSelect, value: j, textNode: `${classification} - ${j + 1}` });
            if (settings.level && settings.level === j) { option.setAttribute("selected", "selected"); }
        }
    }

    function addHoursField() {
        addInputField(`Hours-worth of ${type}: `, {
            type: "text",
            name: `${type}-amount-${id}`,
            id: `${type}Amount${id}`,
            value: settings.hours
        });
    }

    function addRateSelect() {
        createHTMLElement("label", { parentNode: newFS, for: `${type}Rate${id}`, textNode: "Overtime Rate:" });
        const newRateSelect = createHTMLElement("select", { parentNode: newFS, name: `${type}-rate-${id}`, id: `${type}Rate${id}` });
        const rates = { "0": "Select Overtime Rate", "0.125": "1/8x - Standby", "1.0": "1.0", "1.5": "1.5", "2.0": "2.0" };

        for (let r in rates) {
            const rate = createHTMLElement("option", { parentNode: newRateSelect, value: r, textNode: rates[r] });
            if (settings.rate && settings.rate === r) rate.setAttribute("selected", "selected");
        }
    }

    // Internal function to create buttons for the section
    function createButtonsDiv() {
        let buttonsDiv = null;
        if (id === 0) {
            buttonsDiv = createHTMLElement("div", { parentNode: newFS, id: `${type}ButtonsDiv` });
            let newDelBtn = createHTMLElement("input", { parentNode: buttonsDiv, type: "button", value: "Remove", id: `remove${type}Btn${id}` });
            let newAddBtn = createHTMLElement("input", { parentNode: buttonsDiv, type: "button", value: `Add another ${type}`, class: `${type}Btn`, id: `add${type}sBtn${id}` });
            newAddBtn.addEventListener("click", () => addSectionHandler(type, {}), false);
            newDelBtn.addEventListener("click", (e) => removeSectionDiv(e.target), false);
        } else {
            buttonsDiv = document.getElementById(`${type}ButtonsDiv`);
            newFS.appendChild(buttonsDiv);
        }
    }

    // Internal function to remove a section
    function removeSectionDiv(target) {
        const sectionElement = target.closest(`.${type}s`);
        if (!sectionElement) return;

        const id = parseInt(sectionElement.id.replace(type, ""), 10);
        let buttonsDiv = document.getElementById(`${type}ButtonsDiv`);
        let previousSection = null;

        if (id > 0) {
            previousSection = document.getElementById(`${type}${id - 1}`);
            if (previousSection) previousSection.appendChild(buttonsDiv);
        }
        sectionElement.parentNode.removeChild(sectionElement);

        // Show the "Add period" button again if the last section was removed
        const containerDiv = document.getElementById(`${type}Div`);
        const remainingSections = containerDiv.querySelectorAll(`.fieldHolder.${type}s`).length;
        const addButton = document.getElementById(`add${capitalizeFirstLetter(type)}Btn`);
        if (remainingSections === 0 && addButton) {
            addButton.style.display = 'inline';
        }
    }

    // Call specific handlers for type-specific field creation
    if (type === "lwop" ) {
        addTwoDateFields();
    } else if (type === "acting") {
        addTwoDateFields();
        addLevelSelect();
    } else if (type === "promotion" ) {
        addDateField();
        addLevelSelect();
    } else if (type === "overtime" || type === "lumpsum") {
        addDateField();
        addHoursField();
        if (type === "overtime") {
            addRateSelect();
        }
    }

    // Create buttons div to add/remove sections
    createButtonsDiv();
}

//#region Dropdowns
function populateSelect(selectElement, options, bookmarkValue = null, placeholder = "Select an option", autoSelectSingle = false) {
	// Clear out existing options, but keep the placeholder
	selectElement.length = 1;
	selectElement.options[0].text = placeholder;

	// Add options to the dropdown
	options.forEach(option => {
		const attributes = { parentNode: selectElement, textNode: option.text, value: option.value };
		if (bookmarkValue !== null && bookmarkValue !== undefined && bookmarkValue === option.value) {
            attributes["selected"] = true;
        }
		createHTMLElement("option", attributes);
	});

	// If there is exactly one option and autoSelectSingle is true, select it automatically
	if (autoSelectSingle && options.length === 1) {
		selectElement.selectedIndex = 1; // Select the first (and only) non-placeholder option
		// Trigger the next step if applicable (e.g., populateCASelect)
		selectElement.dispatchEvent(new Event("change"));
	}
}

// Populate Group Select
function populateGroupSelect(bookmarkGroup = null) {
    const groupSel = document.getElementById("groupSelect");
    const groups = Object.keys(data).map(group => ({ text: group, value: group }));
    populateSelect(groupSel, groups, bookmarkGroup, "Select the group");
} // End of populateGroupSelect

// Populate Classification Select
function populateClassificationSelect(bookmarkClassification = null) {
    const classSel = document.getElementById("classificationSelect");
    const classifications = Object.keys(data[group]).map(cls => ({ text: cls, value: cls }));
    populateSelect(classSel, classifications, bookmarkClassification, "Select the classification", true);
} // End of populateClassificationSelect

// Populate Collective Agreement (CA) Select
function populateCASelect(bookmarkCA = null) {
    const CASel = document.getElementById("CASelect");
    const CAs = Object.keys(data[group][classification]).map(ca => ({ text: ca, value: ca }));
    populateSelect(CASel, CAs, bookmarkCA, "Select the collective agreement", true);
} // End of Collective

// Populate Level Select
function populateLevelSelect(bookmarkLevel = null) {
    const levelSel = document.getElementById("levelSelect");
    const levels = Array.from({ length: CA.levels }, (_, i) => ({ text: `${classification}-${i + 1}`, value: i }));
    populateSelect(levelSel, levels, bookmarkLevel, "Select your level");
} // End of populateLevelSelect

// Populate Step Select
function populateStepSelect(bookmarkStep = null) {
    const stepSel = document.getElementById("stepSelect");
    const steps = CA.salaries[level].map((salary, i) => ({ text: `Step ${i + 1} - ${getNum(salary)}`, value: i }));
    populateSelect(stepSel, steps, bookmarkStep, "Select your step");
} // End of populateStepSelect

function guessStepByStartDate() {
    // Ensure CA and level are selected before proceeding
    if (!CA || isNaN(level) || level < 0 || level >= CA.levels) {
        console.error("guessStepByStartDate:: Missing or invalid CA/level:", { CA, level });
        return;
    }
    const startDate = getStartDate();

    const timeDiff = (CA.startDate - startDate) / (24 * 60 * 60 * 1000);
    const years = Math.floor(timeDiff / 365);

    // Set appropriate calculated start date in the DOM
    const calcStartDate = document.getElementById("calcStartDate");
    const dateToUse = timeDiff < 0 ? startDate : CA.startDate;
    calcStartDate.setAttribute("datetime", dateToUse.toISOString().split('T')[0]);
    calcStartDate.innerHTML = dateToUse.toLocaleString("en-CA", { year: 'numeric', month: 'long', day: 'numeric' });

    // Determine step and update the dropdown
    const step = timeDiff < 0 ? 1 : Math.min(years, CA.salaries[level].length - 1);
    document.getElementById("stepSelect").selectedIndex = step + 1;
} // End of guessStepByStartDate

function clearDynamicSections(sectionIds) {
    sectionIds.forEach(id => {
        const container = document.getElementById(id);
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        // Reveal the hidden "Add" button for each section
        const addButtonId = `add${id.charAt(0).toUpperCase() + id.slice(1, -3)}Btn`;
        const button = document.getElementById(addButtonId);
        if (button) { button.style.display = "inline"; }
    });
}

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
			clearDynamicSections(["actingDiv", "promotionDiv"]);
			/* falls through */
		case "levelSel" :
			stepSel.selectedIndex = 0;
			stepSel.length = 1;
			/* falls through */
		case "stepSel" :
			break;
	}
}
//endregion

//#region Validation
function validateForm(){
    let errors = {};

	// Validate Start Date
    const startDateInput = document.getElementById("startDateTxt");
    const startDate = parseDateString(startDateInput.value);
    if (!startDate) { errors["startDateTxt"] = "Start date must be in the format YYYY-MM-DD"; }

	// Validate Start Date
    const endDateInput = document.getElementById("endDateTxt");
    const endDate = parseDateString(endDateInput.value);
    if (!endDate) { errors["endDateTxt"] = "End date must be in the format YYYY-MM-DD"; }
    else if (endDate < startDate) {  errors["endDateTxt"] = "End date must after your starting date"; }
    else if (endDate < CA.startDate) {  errors["endDateTxt"] = "End date must after the start date of your collective agreement"; }

	// Validate dynamic sections (Promotions, Actings, Leave Without Pay, etc.)
    if (startDate && endDate) {
        validateActingSections(errors, startDate, endDate);
        validateLWOPSections(errors, startDate, endDate);
        validatePromotions(errors, startDate, endDate);
        validateOvertimeSections(errors);
        validateLumpSumSections(errors);
    }

	// Validate that all dropdown selectors have a non-default value selected
    const requiredSelectors = [
        { id: "groupSelect", placeholderValue: "Select the group" },
        { id: "classificationSelect", placeholderValue: "Select the classification" },
        { id: "CASelect", placeholderValue: "Select the collective agreement" },
        { id: "levelSelect", placeholderValue: "Select your level" },
        { id: "stepSelect", placeholderValue: "Select your step" }
    ];

    requiredSelectors.forEach(({ id, placeholderValue }) => {
        const selectElement = document.getElementById(id);
        if (selectElement.value === placeholderValue) {
            errors[id] = `Please select a valid option for ${id}.`;
        }
    });

    return { isValid: Object.keys(errors).length === 0, errors };
} // End of validateForm

// Function to validate dynamic sections by their container ID
function validateDynamicSections(containerId, errors, startDate, endDate) {
    const container = document.getElementById(containerId);

    // Iterate through each fieldset in the container (each promotion, acting, etc. is a fieldset)
    container.querySelectorAll("fieldset").forEach((fieldset, index) => {
        // Validate overtime hours and lumpsum hours are numbers zero or higher
		const hoursInputs = container.querySelectorAll("input[type='text'][name*='-amount-']");
		hoursInputs.forEach((hoursInput, index) => {
			const hoursValue = parseFloat(hoursInput.value);
			if (isNaN(hoursValue) || hoursInput.value.trim() === "" || hoursValue < 0) {
				errors[hoursInput.id] = `Hours in ${containerId} #${index + 1} must be a valid number that is 0 or greater.`;
			}
		});

        // Validate date fields are after the start of the CA and between the users entered start and end date
        const singleDateInput = fieldset.querySelector("input[type='date'][name*='-date-']");
        const fromDateInput = fieldset.querySelector("input[type='date'][name*='-from-']");
        const toDateInput = fieldset.querySelector("input[type='date'][name*='-to-']");

        // Validate single date inputs for Promotions, Acting, Overtime, and Lump Sum Payments
        if (singleDateInput) {
            const dateValue = parseDateString(singleDateInput.value);
            if (!dateValue) {
                errors[singleDateInput.id] = `Date in ${containerId} #${index + 1} must be in the format YYYY-MM-DD.`;
            } else if (dateValue < startDate || dateValue > endDate) {
                errors[singleDateInput.id] = `Date in ${containerId} #${index + 1} must be between your selected start and end dates`;
            } else if (dateValue < CA.startDate ) {
                errors[singleDateInput.id] = `Date in ${containerId} #${index + 1} must be after the start of the collective agreement period.`;
            }
        }

        // Validate "from" and "to" dates for Leave Without Pay
        if (fromDateInput && toDateInput) {
            const fromDate = parseDateString(fromDateInput.value);
            const toDate = parseDateString(toDateInput.value);

			if (!fromDate) {
				errors[fromDateInput.id] = `From date in ${containerId} #${index + 1} must be in the format YYYY-MM-DD.`;
			} else if (fromDate < startDate || fromDate > endDate) {
				errors[fromDateInput.id] = `From date in ${containerId} #${index + 1} must be between your selected start and end dates.`;
			} else if (fromDate < CA.startDate) {
				errors[fromDateInput.id] = `From date in ${containerId} #${index + 1} must be after the start of the collective agreement period.`;
			}

			// Validate the "to" date
			if (!toDate) {
				errors[toDateInput.id] = `To date in ${containerId} #${index + 1} must be in the format YYYY-MM-DD.`;
			} else if (toDate < fromDate) {
				errors[toDateInput.id] = `To date in ${containerId} #${index + 1} must be after the from date.`;
			} else if (toDate < startDate || toDate > endDate) {
				errors[toDateInput.id] = `To date in ${containerId} #${index + 1} must be between your selected start and end dates.`;
			} else if (toDate < CA.startDate) {
				errors[toDateInput.id] = `To date in ${containerId} #${index + 1} must be after the start of the collective agreement period.`;
			}
        }
    });
} // End of validateDynamicSections

// Validation function for Promotions
function validatePromotions(errors, startDate, endDate) {
    const container = document.getElementById("promotionDiv");
    container.querySelectorAll("fieldset").forEach((fieldset, index) => {
        const promotionDateInput = fieldset.querySelector("input[type='date'][name*='-date-']");
        const dateValue = parseDateString(promotionDateInput.value);
        if (!dateValue) {
            errors[promotionDateInput.id] = `Promotion date must be in the format YYYY-MM-DD.`;
        } else if (dateValue < startDate || dateValue > endDate) {
            errors[promotionDateInput.id] = `Promotion date must be between your selected start and end dates.`;
        } else if (dateValue < CA.startDate) {
            errors[promotionDateInput.id] = `Promotion date must be after the start of the collective agreement period.`;
        }
    });
}


// Validation function for Acting sections (including overlap)
function validateActingSections(errors, startDate, endDate) {
    const container = document.getElementById("actingDiv");
    const periods = [];

    container.querySelectorAll("fieldset").forEach((fieldset, index) => {
        const fromDateInput = fieldset.querySelector("input[type='date'][name*='-from-']");
        const toDateInput = fieldset.querySelector("input[type='date'][name*='-to-']");

        // Validate "from" and "to" dates
        if (fromDateInput && toDateInput) {
            const fromDate = parseDateString(fromDateInput.value);
            const toDate = parseDateString(toDateInput.value);

            // Assuming CA.startDate is defined and represents the start date of the new CA
            const oneYearBeforeCA = new Date(CA.startDate);
            oneYearBeforeCA.setUTCFullYear(oneYearBeforeCA.getUTCFullYear() - 1);

            // Validate "from" date for Acting (or other sections)
            if (!fromDate) {
                errors[fromDateInput.id] = `From date must be in the format YYYY-MM-DD.`;
            } else if (fromDate < startDate || fromDate > endDate) {
                errors[fromDateInput.id] = `From date must be between your selected start and end dates.`;
            } else if (fromDate < CA.startDate) {
                errors[fromDateInput.id] = `From date must be on or after the start of the collective agreement period.`;
            }


            if (!toDate) {
                errors[toDateInput.id] = `To date  must be in the format YYYY-MM-DD.`;
            } else if (toDate < fromDate) {
                errors[toDateInput.id] = `To date must be after the from date.`;
            } else if (toDate < startDate || toDate > endDate) {
                errors[toDateInput.id] = `To date must be between your selected start and end dates.`;
            } else if (toDate <= CA.startDate) {
                errors[toDateInput.id] = `To date must be after the start of the collective agreement period.`;
            }

            // Collect periods for overlap validation
            if (fromDate && toDate) {
                periods.push({ fromDate, toDate, id: fieldset.id });
            }
        }
    });

    // Overlap validation
    for (let i = 0; i < periods.length; i++) {
        for (let j = i + 1; j < periods.length; j++) {
            const periodA = periods[i];
            const periodB = periods[j];
            if (periodA.fromDate <= periodB.toDate && periodA.toDate >= periodB.fromDate) {
                errors[periodA.id] = `Acting period ${i + 1} overlaps with Acting period ${j + 1}.`;
                errors[periodB.id] = `Acting period ${j + 1} overlaps with Acting period ${i + 1}.`;
            }
        }
    }
}

// Validation function for LWOP sections (including overlap)
function validateLWOPSections(errors, startDate, endDate) {
    const container = document.getElementById("lwopDiv");
    const periods = [];

    container.querySelectorAll("fieldset").forEach((fieldset, index) => {
        const fromDateInput = fieldset.querySelector("input[type='date'][name*='-from-']");
        const toDateInput = fieldset.querySelector("input[type='date'][name*='-to-']");

        // Validate "from" and "to" dates
        if (fromDateInput && toDateInput) {
            const fromDate = parseDateString(fromDateInput.value);
            const toDate = parseDateString(toDateInput.value);

            if (!fromDate) {
                errors[fromDateInput.id] = `From date in LWOP #${index + 1} must be in the format YYYY-MM-DD.`;
            } else if (fromDate < startDate || fromDate > endDate) {
                errors[fromDateInput.id] = `From date in LWOP #${index + 1} must be between your selected start and end dates.`;
            } else if (fromDate < CA.startDate) {
                errors[fromDateInput.id] = `From date in LWOP #${index + 1} must be after the start of the collective agreement period.`;
            }

            if (!toDate) {
                errors[toDateInput.id] = `To date in LWOP #${index + 1} must be in the format YYYY-MM-DD.`;
            } else if (toDate < fromDate) {
                errors[toDateInput.id] = `To date in LWOP #${index + 1} must be after the from date.`;
            } else if (toDate < startDate || toDate > endDate) {
                errors[toDateInput.id] = `To date in LWOP #${index + 1} must be between your selected start and end dates.`;
            } else if (toDate < CA.startDate) {
                errors[toDateInput.id] = `To date in LWOP #${index + 1} must be after the start of the collective agreement period.`;
            }

            // Collect periods for overlap validation
            if (fromDate && toDate) {
                periods.push({ fromDate, toDate, id: fieldset.id });
            }
        }
    });

    // Overlap validation
    for (let i = 0; i < periods.length; i++) {
        for (let j = i + 1; j < periods.length; j++) {
            const periodA = periods[i];
            const periodB = periods[j];
            if (periodA.fromDate <= periodB.toDate && periodA.toDate >= periodB.fromDate) {
                errors[periodA.id] = `LWoP period ${i + 1} overlaps with LWoP period ${j + 1}.`;
                errors[periodB.id] = `LWoP period ${j + 1} overlaps with LWoP period ${i + 1}.`;
            }
        }
    }
}

// Validation function for Overtime sections
function validateOvertimeSections(errors) {
    const container = document.getElementById("overtimeDiv");
    container.querySelectorAll("fieldset").forEach((fieldset, index) => {
        const hoursInput = fieldset.querySelector("input[type='text'][name*='-amount-']");
        const rateSelect = fieldset.querySelector("select[name*='-rate-']");

        const hoursValue = parseFloat(hoursInput.value);
        if (isNaN(hoursValue) || hoursInput.value.trim() === "" || hoursValue < 0) {
            errors[hoursInput.id] = `Hours  must be a valid number that is 0 or greater.`;
        }

        if (rateSelect && rateSelect.value === "Select Overtime Rate") { errors[rateSelect.id] = `Please select a valid overtime rate.`; }
    });
}

// Validation function for Lump Sum sections
function validateLumpSumSections(errors) {
    const container = document.getElementById("lumpsumDiv");
    container.querySelectorAll("fieldset").forEach((fieldset, index) => {
        const hoursInput = fieldset.querySelector("input[type='text'][name*='-amount-']");

        const hoursValue = parseFloat(hoursInput.value);
        if (isNaN(hoursValue) || hoursInput.value.trim() === "" || hoursValue < 0) {
            errors[hoursInput.id] = `Hours must be a valid number that is 0 or greater.`;
        }
    });
}

function addErrorMessage(inID, errMsg) {
    const el = document.getElementById(inID);

    if (el) {
        console.debug(`addErrorMessage::Adding error for ${inID}: ${errMsg}`);
        let errDiv = null;
        errDiv = document.getElementById(`${inID}Error`);

        // Create the error message container only if it doesn't exist
        if (!errDiv) {
            errDiv = createHTMLElement("div", { parentNode: el.parentNode, id: `${inID}Error`, class: "error" });
            el.parentNode.insertBefore(errDiv, el.nextSibling); // Insert the error message directly below the input field
        }
        createHTMLElement("p", { parentNode: errDiv, textNode: errMsg });

        // Update the aria-describedby attribute for accessibility
        if (el.hasAttribute("aria-describedby")) { el.setAttribute("aria-describedby", `${el.getAttribute("aria-describedby")} ${inID}Error`); }
        else { el.setAttribute("aria-describedby", `${inID}Error`); }
    } else {
        console.error(`addErrorMessage::Couldn't get element ${inID}`);
    }
} // End of addErrorMessage

function removeErrorMessage(inID) {
    const inputEl = document.getElementById(inID);
    const errorEl = document.getElementById(`${inID}Error`);

    if (!inputEl) { console.error(`removeErrorMessage::Couldn't get element ${inID}.`); return; }
    if (!errorEl) { console.error(`removeErrorMessage::Couldn't get element ${inID}Error.`); return; }

    // Update the aria-describedby attribute to remove the error reference
    if (inputEl.hasAttribute("aria-describedby")) {
        let ariaDesc = inputEl.getAttribute("aria-describedby").split(' ').filter(desc => desc !== `${inID}Error`).join(' ').trim();

        if (ariaDesc) { inputEl.setAttribute("aria-describedby", ariaDesc); }
        else { inputEl.removeAttribute("aria-describedby"); }
    }
    errorEl.remove();
} // End of removeErrorMessage

function displayErrors(errors) {
    // Add error messages for fields with current errors
    Object.keys(errors).forEach(fieldId => {
        const errMsg = errors[fieldId];
        addErrorMessage(fieldId, errMsg);
    });
}

function startProcess(){}
//endregion

//#region Exported Functions
function generateRateTables(rates){
    return false;
}

function generatePayTables(periods){
    return false
}

export { generateRateTables, generatePayTables };
//endregion


function setupEventListeners() {
	// Define a local helper function to add change listeners
    function addChangeListener(elementId, callback) {
        document.getElementById(elementId).addEventListener("change", callback, false);
    }

	addChangeListener("groupSelect",function () {
        group = this.value;
        resetSelectors("groupSel");
        populateClassificationSelect();
    });

   	addChangeListener("classificationSelect", function () {
        classification = this.value; // Use 'this' to refer to the current element
        resetSelectors("classSel");
        populateCASelect();
    });

    addChangeListener("CASelect", function () {
        chosenCA = this.value; // Use 'this' to refer to the current element
        CA = data[group][classification][chosenCA];
        // CA.startDate = parseDateString(CA.startDate);
        // CA.endDate = parseDateString(CA.endDate);
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
    });

	// TODO: If the level changes we want to change the options in the Step selector, but we also want to keep the date
    addChangeListener("levelSelect", function () {
        level = Number(this.value); // Use 'this' to refer to the current element
        resetSelectors("levelSel");
        populateStepSelect(step);
    });

	// If the date changes we want to guess their current step
    addChangeListener("startDateTxt", guessStepByStartDate)
	// document.getElementById("startDateTxt").addEventListener("change", guessStepByStartDate, false);

    addChangeListener("stepSelect", function () {
        step = this.value; // Use 'this' to refer to the current element
        resetSelectors("stepSel");
    });

    document.getElementById('addActingBtn').addEventListener('click', () => { addSectionHandler("acting", {}); }, false);
    document.getElementById('addLwopBtn').addEventListener('click', () => { addSectionHandler("lwop", {}); }, false);
    document.getElementById('addOvertimeBtn').addEventListener('click', () => { addSectionHandler("overtime", {}); }, false);
    document.getElementById('addLumpsumBtn').addEventListener('click', () => { addSectionHandler("lumpsum", {}); }, false);
    document.getElementById('addPromotionBtn').addEventListener('click', () => { addSectionHandler("promotion", {}); }, false);

	document.getElementById("calcBtn").addEventListener("click", function(event) {
        event.preventDefault(); // Stop form submission if validation fails
        // Clear all existing error messages before validating
        document.querySelectorAll(".error").forEach(errorEl => {
            const fieldId = errorEl.id.replace("Error", "");
            removeErrorMessage(fieldId);
        });

        const validationResult = validateForm();
        if (!validationResult.isValid) {
            displayErrors(validationResult.errors);
        } else {
            const form = document.getElementById("mainForm");
            savaDataToURL("mainForm");
            StartProcess(new FormData(form));
        }
    });
} // End of setupEventListeners

const testingURl = "/backpayCalc/backpayCalc.html?group=IT+Group&classification=IT&collective-agreement=2021-2025&level=0&start-date=2020-01-01&step=0&end-date=2024-02-14"

function main() {
	console.log("Got data:", data);
	console.log("Got i18n:", i18n);

	lang = document.documentElement.lang;
	console.debug("Got lang:", lang);

	if (dbug === false) {
		populateSelect(document.getElementById("groupSelect"), Object.keys(data).map(group => ({ text: group, value: group })), null, "Select the group");
	} else {
        loadDataFromUrl(testingURl);
		// group="IT Group";
		// classification = "IT";
		// chosenCA = "2021-2025";
		// CA = data[group][classification][chosenCA];
		// CA.levels = 5;
		// level=0;
		// step=0;
		// document.getElementById("startDateTxt").value="2022-01-01";
        //
		// populateGroupSelect ("IT Group");
		// populateClassificationSelect("IT");
		// populateCASelect("2021-2025");
		// // generateTables(CA);
		// populateLevelSelect(0);
		// populateStepSelect(0);
	}


    setupEventListeners();  // Moved all event listener setup to a separate function
} // End of main
console.log("Finished loading UI.js.");
main();

