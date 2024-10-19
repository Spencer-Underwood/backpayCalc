// backpayCalc.js
// Documentation on acting pay: https://www.canada.ca/en/public-services-procurement/services/pay-pension/pay-administration/access-update-pay-details/pay-changes-in-your-life/changing-your-employment/acting-position.html
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
    ANNIVERSARY:"Anniversary",
    CONTRACTUAL_INCREASE: 'Contractual Increase',
    FISCAL_NEW_YEAR: 'Fiscal New Year',
    PROMOTION:"Promotion",
    ACTING_START:"Acting Start",
    ACTING_END:"Acting End",
    ACTING_ANNIVERSARY: 'Acting Anniversary',
    LWOP_START:"LWoP Start",
    LWOP_STOP:"LWoP Stop",
    OVERTIME:"Overtime",
    LUMP_SUM:"Lumpsum"
}

class Event {
    constructor({ type, date: date, level = null, step = null, hours = null, rate = 1 }) {
        if (!type || !date) { throw new Error('Missing required parameters: type and date'); }
        this.type = type; // Type of period (e.g., 'Normal', 'Acting', 'LWOP', etc.)
        this.startDate = new Date(date);
        this.level = level;
        this.step = step;
        this.hours = hours;
        this.rate = rate;
    }
}

// Like events, but has a definitive start and end date and can include payments for lumpsum and OT payments
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
//endregion Events

//#region Pay Calculations
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

function getApplicableRate(rates, targetDate) {
    const target = new Date(targetDate);
    // Extract date keys, ignoring the "current" key
    const rateDates = Object.keys(rates).filter(date => date !== "current").map(date => new Date(date)).sort((a, b) => a - b);


    // Shortcut the cases where date is before or after the available range of rates
    if (target < rateDates[0]) { return rates["current"]; }
    if (target > rateDates[rateDates.length - 1]) { return rates[ (rateDates[rateDates.length - 1]).toISODateString() ]; }

    // Iterate through the sorted dates to find the applicable rate
    let applicableRate = null;
    for (let i = 0; i < rateDates.length; i++) {
        if (target >= rateDates[i]) { applicableRate = rates[(rateDates[i]).toISODateString()];
        } else { break; }
    }
    return applicableRate;
}

// Used for both promotions AND actings
// https://www.canada.ca/en/public-services-procurement/services/pay-pension/pay-administration/access-update-pay-details/pay-changes-in-your-life/changing-your-employment/acting-position.html
function getPromotionalPay(rates, targetDate) {
    const target = new Date(targetDate);
    // Extract date keys, ignoring the "current" key
    const rateDates = Object.keys(rates).filter(date => date !== "current").map(date => new Date(date)).sort((a, b) => a - b);


    // Shortcut the cases where date is before or after the available range of rates
    if (target < rateDates[0]) { return rates["current"]; }
    if (target > rateDates[rateDates.length - 1]) { return rates[ (rateDates[rateDates.length - 1]).toISODateString() ]; }

    // Iterate through the sorted dates to find the applicable rate
    let applicableRate = null;
    for (let i = 0; i < rateDates.length; i++) {
        if (target >= rateDates[i]) { applicableRate = rates[(rateDates[i]).toISODateString()];
        } else { break; }
    }
    return applicableRate;
}

function theBigOne(events, rates, startDate, endDate, caStartDate, level, step){
    function calculatePromotion(level, step, newLevel){
        // level 2, step 7
        // if not maxed out on substantive increments, then:
        // find minimum increment for acting level (step 2 minus step 1)
        // calculate substantive salary with new yearly increment
        // add minimum increment to substantive salary, find first step of new acting level that is <LESS> than the combined values
        // else:
        // on anniversary of ACTING, increment pay by one step from new acting level
    }

    // TODO: Change to use the greater of startEvent or CA.startDate (in case no startEvent
    const startEvent = events.find(event => event.type === EventType.START);
    if (startEvent) {events.filter(event => event.date < startEvent.date).forEach(event => event.rate = 0); }

    const endEvent = events.find(event => event.type === EventType.END);
    if (endEvent) {events.filter(event => event.date > endEvent.date).forEach(event => event.rate = 0); }

    let baseLevel = level;
    let baseStep = step;
    // let baseSalary = rates.annual[baseLevel][baseStep];
    let baseAnniversary = startDate;

    var whatever = getApplicableRate(rates, "2023-01-01");


    events.filter()
}

//endregion Pay Calculations

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

    //#region Add Events
    const events = [];
    events.push(new Event({type:EventType.START, date:startDate}));
    events.push(new Event({type:EventType.END, date:endDate}));

    CA.periods.forEach((period) => {
        if (period.type === "Contractual Increase" || period.type === "Fiscal New Year")
            events.push(new Event({type:period.type, date:period.date}));
        }
    )

    let promoId = 0;
    while (true){
        const promoDate = formDataObject[`promotion-date-${promoId}`];
        const promoLevel = formDataObject[`promotion-level-${promoId}`];

        if (promoDate === undefined || promoLevel === undefined) { break; } // If sections don't exist, exit loop

        events.push(new Event({type:EventType.PROMOTION, date:promoDate, level:promoLevel}));
        promoId += 1;
    }

    let actingId = 0;
    while (true){
        const actingFrom = formDataObject[`acting-from-${actingId}`];
        const actingTo = formDataObject[`acting-to-${actingId}`];
        const actingLevel = formDataObject[`acting-level-${actingId}`];

        if (actingFrom === undefined || actingTo === undefined || actingLevel === undefined) { break; } // If sections don't exist, exit loop

        events.push(new Event({type:EventType.ACTING_START, date:actingFrom, level:actingLevel}));
        events.push(new Event({type:EventType.ACTING_END, date:actingTo, level:actingLevel}));
        actingId += 1;
    }

    let lwopId = 0;
    while (true){
        const lwopFrom = formDataObject[`lwop-from-${lwopId}`];
        const lwopTo = formDataObject[`lwop-to-${lwopId}`];

        if (lwopFrom === undefined || lwopTo === undefined) { break; } // If sections don't exist, exit loop

        events.push(new Event({type:EventType.LWOP_START, date:lwopFrom, rate:0}));
        events.push(new Event({type:EventType.LWOP_STOP, date:lwopTo, rate:1}));
        lwopId += 1;
    }

    let overtimeId = 0;
    while (true){
        const overtimeDate = formDataObject[`overtime-date-${overtimeId}`];
        const overtimeAmount = formDataObject[`overtime-amount-${overtimeId}`];
        const overtimeRate = formDataObject[`overtime-rate-${overtimeId}`];

        if (overtimeDate === undefined || overtimeAmount === undefined) { break; } // If sections don't exist, exit loop

        events.push(new Event({type:EventType.OVERTIME, date:overtimeDate, hours:overtimeAmount, rate:overtimeRate }));
        overtimeId += 1;
    }

    let lumpsumId = 0;
    while (true){
        const lumpsumDate = formDataObject[`lumpsum-date-${lumpsumId}`];
        const lumpsumAmount = formDataObject[`lumpsum-amount-${lumpsumId}`];

        if (lumpsumDate === undefined || lumpsumAmount === undefined) { break; } // If sections don't exist, exit loop

        events.push(new Event({type:EventType.LUMP_SUM, startDate:lumpsumDate, hours:lumpsumAmount}));
        lumpsumId += 1;
    }
    events.sort((a, b) => a.startDate - b.startDate);
    //endregion AddEvents

    let rates = generateRates(CA);
    generateRateTables(rates);
    const currentRates = rates.current;
    delete rates.current;

    theBigOne(events, rates, startDate, endDate, level, step, CA.startDate);
    console.log(rates);

    // Restore `current` after your calculations
    rates.current = currentRates;
    return false;
}

// Export the StartProcess function
export { StartProcess };
console.log("Finished loading backpayCalc.js")