// backpayCalc.js
import {data} from "./raiseInfo.js";
import {i18n} from "./i18n.js";
import {generateRateTables, generatePayTables } from "./UI.js"

const WeeksInYear = 52.176;
const DaysInYear = 260.88;

//#region Helpers
Date.prototype.toISODateString = function() {
	return this.toISOString().split('T')[0];
};
Date.prototype.toString = function() {
	return this.toISOString();
};

//endregion Helpers

//region Events
const EventType = {
    START:"Start",
    END:"End",
    CONTRACTUAL_INCREASE: 'Contractual Increase',
    FISCAL_NEW_YEAR: 'Fiscal New Year',
    PROMOTION:"Promotion",
    ANNIVERSARY:"Anniversary",
    ACTING:"Acting",
    ACTING_ANNIVERSARY: 'Acting Anniversary',
    LWOP:"LWoP",
    OVERTIME:"Overtime",
    LUMP_SUM:"Lumpsum"
}

class Event {
    constructor(type, startDate, level = null, step = null, hours=null, rate = 1) {
        this.type = type;                 // Type of period (e.g., 'Normal', 'Acting', 'LWOP', etc.)
        this.startDate = new Date(startDate);
        this.level = level;
        this.step = step;
        this.hours = hours;
        this.rate = rate;
    }
}


class Period {
    constructor(type, startDate, endDate, level, step, earned, owed, rate = 1, oneTimeEvents = []) {
        this.type = type;                 // Type of period (e.g., 'Normal', 'Acting', 'LWOP', etc.)
        this.startDate = new Date(startDate);
        this.startDate = new Date(startDate);
        this.level = level;
        this.step = step;
        this.earned = earned;
        this.owed = owed;
        this.rate = rate;
        this.OneTimeEvents = oneTimeEvents;
    }
}

// This class is designed to manage a collection of Event objects, ensuring they do not overlap and all fall within a defined date range.
// It allows adding new periods while maintaining a sorted list, validating that each period fits within the specified range and does not conflict with existing periods.
class EventManager {
    constructor(startDate, endDate, level, step) {
        this.events = [];
        this.startDate = new Date(startDate);
        this.endDate = new Date(endDate);
        this.level = level;
        this.step = step;
    }

    addNewEvent(options) {
        // Destructure the properties from the options object, providing default values for all but type and startDate
        const {type, startDate, level = null, step = null, hours=null, rate = 1} = options;

        // Check if required parameters are provided
        if (!type || !startDate) {
            throw new Error('Missing required parameters: type and startDate');
        }

        // Use the parameters to create a new Event
        const newEvent = new Event(type, startDate, level, step, hours, rate);
        this.events.push(newEvent);
        this.events.sort((a, b) => a.startDate - b.startDate);
    }

    getPayPeriods(rates){
        const periods = [];

        // Set the rate to 0 for events before the start of the end events.
        const startEvent = this.events.find(event => event.type === EventType.START);
        if (startEvent) { // Set rate to 0 for all events with startDate before the startEvent's startDate
            this.events.filter(event => event.startDate < startEvent.startDate).forEach(event => { event.rate = 0; });
        }

        const endEvent = this.events.find(event => event.type === EventType.END);
        if (endEvent) {
            this.events.filter(event => event.startDate > endEvent.startDate).forEach(event => { event.rate = 0; });
        }

        let currentStartdate = this.startDate;
        let currentLevel = this.level;
        let currentStep = this.step;
        for (let eventIndex = 0; eventIndex < this.events.length - 1; eventIndex++) {
            const event = this.events[eventIndex];
            const nextEvent = this.events[eventIndex + 1];
            let endDate = new Date(nextEvent.startDate);
            endDate.setUTCDate(endDate.getUTCDate()-1);

            // Create a period from the current event to the start date of the next event
            const period = new Period(
                event.type,                // Type of period
                event.startDate,           // Start date of the period
                endDate, // End date: the day before the next event
                event.level,               // Level during this period (if applicable)
                event.step,                // Step during this period (if applicable)
                0,                         // earned (you'll calculate this later)
                0,                         // owed (you'll calculate this later)
                event.rate                 // Rate for this period
            );
            periods.push(period);
        }

        return periods;
    }
}
//endregion Events

function generateRates(CA) {
    const calculateSalaryBreakdown = (annual, HoursPerWeek) => ({
        annual: annual,
        weekly: annual / WeeksInYear,
        daily: annual / DaysInYear,
        hourly: annual / WeeksInYear / HoursPerWeek
    });

    console.log(`backpayCalc::generateRates::Generating rates for ${CA}`);
    let salaries = CA.salaries;
    let levels = CA.salaries.length;

    // Define the rates object with separate arrays for annual, weekly, daily, and hourly
    let rates = {
        current: {
            annual: [],
            weekly: [],
            daily: [],
            hourly: []
        }
    };

    // Create the starting array based on the unmodified salary dollars in the JSON file
    for (let level = 0; level < levels; level++) {
        let annualSteps = [];
        let weeklySteps = [];
        let dailySteps = [];
        let hourlySteps = [];

        for (let step = 0; step < salaries[level].length; step++) {
            const breakdown = calculateSalaryBreakdown(salaries[level][step], CA.hoursPerWeek);

            annualSteps.push(breakdown.annual);
            weeklySteps.push(breakdown.weekly);
            dailySteps.push(breakdown.daily);
            hourlySteps.push(breakdown.hourly);
        }

        rates.current.annual.push(annualSteps);
        rates.current.weekly.push(weeklySteps);
        rates.current.daily.push(dailySteps);
        rates.current.hourly.push(hourlySteps);
    }

    // Deep copy of the current salary to avoid accidental modification
    let previousAnnual = JSON.parse(JSON.stringify(rates.current.annual));
    let previousCompounded = Array(levels).fill(0);

    const payPeriods = CA.periods.filter(period => period.type === "Contractual Increase")
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Calculate each pay period by multiplying its increment against the previous period.
    for (let i = 0; i < payPeriods.length; i++) {
        let period = payPeriods[i];
        rates[period.date] = {
            annual: [],
            weekly: [],
            daily: [],
            hourly: []
        };

        // If only one increment, apply it to all levels
        if (period.increments.length === 1) {
            period.increments = Array(levels).fill(period.increments[0]);
        }

        for (let level = 0; level < period.increments.length; level++) {
            let incrementValue = Number(period.increments[level]);
            let annualSteps = [];
            let weeklySteps = [];
            let dailySteps = [];
            let hourlySteps = [];

            for (let step = 0; step < previousAnnual[level].length; step++) {
                let annual = previousAnnual[level][step] * (1 + incrementValue / 100);
                const breakdown = calculateSalaryBreakdown(annual, CA.hoursPerWeek);

                annualSteps.push(breakdown.annual);
                weeklySteps.push(breakdown.weekly);
                dailySteps.push(breakdown.daily);
                hourlySteps.push(breakdown.hourly);
            }

            rates[period.date].annual.push(annualSteps);
            rates[period.date].weekly.push(weeklySteps);
            rates[period.date].daily.push(dailySteps);
            rates[period.date].hourly.push(hourlySteps);
        }

        rates[period.date].increments = period.increments;
        rates[period.date].compounded = previousCompounded.map((prev, idx) => ((1 + prev / 100) * (1 + period.increments[idx] / 100) - 1) * 100);

        // Update "previous" variables for the next iteration
        previousAnnual = JSON.parse(JSON.stringify(rates[period.date].annual));
        previousCompounded = [...rates[period.date].compounded];
    }
    // Finally, after all calculations are done slap this bad boy into its CA
    return rates;
}

// Placeholder function to kick off the backpay calculations
function StartProcess(formData, CA=null) {
    console.log("StartProcess::Starting backpay calculations...");
    const formDataObject = Object.fromEntries(formData.entries()); //Honestly only kept here to see variables in debug view

    // Access individual entries by key
    const group = formDataObject["group"];
    const classification = formDataObject["classification"];
    const chosenCA = formDataObject["collective-agreement"];
    const level = formDataObject["level"];
    const step = formDataObject["step"];
    const startDate = formDataObject["start-date"];
    const endDate = formDataObject["end-date"];

    if (!CA) {CA = data[group][classification][chosenCA];}

    const manager = new EventManager(CA.startDate, endDate, level, step);
    manager.addNewEvent({type:EventType.START, startDate:startDate});
    manager.addNewEvent({type:EventType.END, startDate:endDate});

    CA.periods.forEach((period) => {
        if (period.type === "Contractual Increase" || period.type === "Fiscal New Year")
            manager.addNewEvent({type:period.type, startDate:period.date});
        }
    )

    let promoId = 0;
    while (true){
        const promoDate = formDataObject[`promotion-date-${promoId}`];
        const promoLevel = formDataObject[`promotion-level-${promoId}`];

        if (promoDate === undefined || promoLevel === undefined) { break; } // If sections don't exist, exit loop

        manager.addNewEvent({type:EventType.PROMOTION, startDate:promoDate, level:promoLevel});
        promoId += 1;
    }

    let actingId = 0;
    while (true){
        const actingFrom = formDataObject[`acting-from-${actingId}`];
        const actingTo = formDataObject[`acting-to-${actingId}`];
        const actingLevel = formDataObject[`acting-level-${actingId}`];

        if (actingFrom === undefined || actingTo === undefined || actingLevel === undefined) { break; } // If sections don't exist, exit loop

        manager.addNewEvent({type:EventType.ACTING, startDate:actingFrom, level:actingLevel});
        manager.addNewEvent({type:EventType.ACTING, startDate:actingTo, level:actingLevel});
        actingId += 1;
    }

    let lwopId = 0;
    while (true){
        const lwopFrom = formDataObject[`lwop-from-${lwopId}`];
        const lwopTo = formDataObject[`lwop-to-${lwopId}`];

        if (lwopFrom === undefined || lwopTo === undefined) { break; } // If sections don't exist, exit loop

        manager.addNewEvent({type:EventType.LWOP, startDate:lwopFrom, rate:0});
        manager.addNewEvent({type:EventType.LWOP, startDate:lwopTo, rate:1});
        lwopId += 1;
    }

    let overtimeId = 0;
    while (true){
        const overtimeDate = formDataObject[`overtime-date-${overtimeId}`];
        const overtimeAmount = formDataObject[`overtime-amount-${overtimeId}`];
        const overtimeRate = formDataObject[`overtime-rate-${overtimeId}`];

        if (overtimeDate === undefined || overtimeAmount === undefined) { break; } // If sections don't exist, exit loop

        manager.addNewEvent({type:EventType.ACTING, startDate:overtimeDate, hours:overtimeAmount, rate:overtimeRate });
        overtimeId += 1;
    }

    let lumpsumId = 0;
    while (true){
        const lumpsumDate = formDataObject[`lumpsum-date-${lumpsumId}`];
        const lumpsumAmount = formDataObject[`lumpsum-amount-${lumpsumId}`];

        if (lumpsumDate === undefined || lumpsumAmount === undefined) { break; } // If sections don't exist, exit loop

        manager.addNewEvent({type:EventType.LUMP_SUM, startDate:lumpsumDate, hours:lumpsumAmount});
        lumpsumId += 1;
    }

    let rates = generateRates(CA);
    generateRateTables(rates);
    const currentRates = rates.current;
    delete rates.current;

    var whatever = manager.getPayPeriods(rates);
    console.log(rates);

    // Restore `current` after your calculations
    rates.current = currentRates;
    return false;
}

// Export the StartProcess function
export { StartProcess };
console.log("Finished loading backpayCalc.js")