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

Date.prototype.addTime = function({ years = 0, months = 0, days = 0 } = {}) {
    const newDate = new Date(this);
    if (years !== 0) { newDate.setUTCFullYear(newDate.getUTCFullYear() + years); }
    if (months !== 0) { newDate.setUTCMonth(newDate.getUTCMonth() + months); }
    if (days !== 0) {newDate.setUTCDate(newDate.getUTCDate() + days);}

    return newDate;
};

function getSteps(){

}
//endregion Helpers

//region Events
const SectionTypes = {
    PROMOTION:"promotion",
    ACTING:"acting",
    LWOP:"lwop",
    OVERTIME:"overtime",
    LUMPSUM:"lumpsum"
}

const EventType = {
    CA_START:"Collective Agreement Start",
    START:"Start",
    END:"End",
    ANNIVERSARY:"Anniversary",
    CONTRACTUAL_INCREASE: 'Contractual Increase',
    FISCAL_NEW_YEAR: 'Fiscal New Year',
    PROMOTION:"Promotion",
    ACTING_START:"Acting Start",
    ACTING_STOP:"Acting Stop",
    ACTING_ANNIVERSARY: 'Acting Anniversary',
    LWOP_START:"LWoP Start",
    LWOP_STOP:"LWoP Stop",
    OVERTIME:"Overtime",
    LUMPSUM:"Lumpsum"
}

class Event {
    constructor({ type, date: date, level = null, step = null, amount = null, rate = 1 }) {
        if (!type || !date) { throw new Error('Missing required parameters: type and date'); }
        this.type = type; // Type of period (e.g., 'Normal', 'Acting', 'LWOP', etc.)
        this.date = new Date(date);
        this.level = level;
        this.step = step;
        this.amount = amount;
        this.rate = rate;
    }
}

function findMatchingActingEvent(events, event) {
    // Find the index of the given event
    const startingIndex = events.findIndex(e => e === event);

    // If the event is not found in the events list, return null
    if (startingIndex === -1) { return null;     }

    let targetEventType = event.type === EventType.ACTING_START ? EventType.ACTING_STOP  : EventType.ACTING_START;

    // Searching for the START searches backwards, searching for STOP searches forward
    if (event.type === EventType.ACTING_START) {
        for (let i = startingIndex + 1; i < events.length; i++) {
            if (events[i].type === targetEventType) {
                return events[i]; // Return the first matching ACTING_END found
            }
        }
    }
    else if (event.type === EventType.ACTING_STOP) {
        for (let i = startingIndex - 1; i >= 0; i--) {
            if (events[i].type === targetEventType) {
                return events[i]; // Return the first matching ACTING_START found
            }
        }
    }

    // If no matching event is found, return null
    return null;
}

// Like events, but has a definitive start and end date and can include payments for lumpsum and OT payments
class Period {
    constructor({ type = [], startDate = null, endDate = null, level = null, step = null, earned = 0, owed = 0, rate = 1, time = 0, oneTimeEvents = []} = {})
    {
        // Initialize properties with default values if none provided
        this.types = Array.isArray(type) ? type : [type]; // Ensure it's always an array
        this.startDate = startDate ? new Date(startDate) : null;
        this.endDate = endDate ? new Date(endDate) : null;
        this.level = level;
        this.step = step;
        this.earned = earned;
        this.owed = owed;
        this.rate = rate;
        this.time = time; // Used for the "time" column in the pay periods table, unit less
        this.oneTimeEvents = oneTimeEvents;
    }

    get type() {
        return this.types.length === 1 ? this.types[0] : this.types;
    }

    set type(newType) {
        if (!this.types.includes(newType)) {
            this.types.push(newType);
        }
    }

    addType(newType) { if (!this.types.includes(newType)) { this.types.push(newType); } }

    hasType(type) { return this.types.includes(type); }

    // Helper function to calculate days between startDate and endDate
    get durationInDays() {
        if (this.startDate && this.endDate) {
            const oneDay = 1000 * 60 * 60 * 24; // Milliseconds in one day
            const differenceMs = this.endDate - this.startDate;
            return Math.round(differenceMs / oneDay);
        } else {
            throw new Error("Start date or end date is not set.");
        }
    }
}

class PeriodManager{
    constructor(){ this.periods = []; }

    addPeriod(period){
        this.periods.push((period));
    };

    getPeriods(){
        return this.periods;
    }

    getPeriodForDate(date){
        // One Time Events should have a start and end date on the same day, so find a period that covers that day
        let matchingPeriod = this.periods.find(period => period.startDate <= date && period.endDate >= date);

        return matchingPeriod;
    }
}

class EventManager {
    constructor() { this.events = []; }

    addEvent(event) {
        this.events.push(event);
    }

    deleteEvents(predicate) {
        this.events = this.events.filter(event => !predicate(event));
    }

    // TODO: This returns a REFERENCE, not a copy. Be careful modifying mid-loop!
    getEvents() {
        this.events.sort((a, b) => a.date - b.date);
        return this.events;
    }

    // Add anniversaries starting from one year after the given start date until the end date
    addAnniversaries(startDate, endDate, eventType = EventType.ANNIVERSARY) {
        let anniversaryDate = startDate.addTime({ years: 1 }); // Start by adding 1 year
        while (anniversaryDate <= endDate) {
            this.addEvent(new Event({ type: eventType, date: new Date(anniversaryDate) }));
            anniversaryDate = anniversaryDate.addTime({ years: 1 }); // Add 1 year for the next iteration
        }
    }
}

//endregion Events

//#region Pay Calculations
function generateEvents(formDataObject, CA, startDate, endDate, level) {
    console.log("generateEvents::Generating events from form data...");

    // Create an EventManager instance to hold events
    const eventManager = new EventManager();

    // Add contractual and fiscal year events from CA data
    CA.periods.forEach((period) => {
        if (period.type === "Contractual Increase" || period.type === "Fiscal New Year") {
            eventManager.addEvent(new Event({ type: period.type, date: period.date }));
        }
    });

    function addDynamicSectionEvents(formDataObject, eventManager, sectionType, fields, eventTypeStart = null, eventTypeEnd = null) {
        let index = 0;

        while (true) {
            // Gather values for start event
            const startEventArgs = {};
            let isStartValid = true;

            fields.forEach(field => {
                const value = formDataObject[`${sectionType}-${field}-${index}`];
                if (value === undefined) { isStartValid = false; }
                // Map "from" or "to" to "date"
                if (field === "from" || field === "to") {
                    startEventArgs["date"] = value;
                } else {
                    startEventArgs[field] = value; }
            });

            if (!isStartValid) { break; }

            // Add start event
            if (eventTypeStart) { eventManager.addEvent(new Event({ type: eventTypeStart, ...startEventArgs })); }

            // If there is an end event type, add an event for that too
            if (eventTypeEnd) {
                const endValue = formDataObject[`${sectionType}-to-${index}`];
                if (endValue !== undefined) { eventManager.addEvent(new Event({ type: eventTypeEnd, date: endValue }));}
            }
            index++;
        }
    }

    // Add events for each of the dynamic sections
    addDynamicSectionEvents(formDataObject, eventManager, SectionTypes.PROMOTION, ["date", "level"], EventType.PROMOTION);
    addDynamicSectionEvents(formDataObject, eventManager, SectionTypes.ACTING, ["from", "level"], EventType.ACTING_START, EventType.ACTING_STOP);
    addDynamicSectionEvents(formDataObject, eventManager, SectionTypes.LWOP, ["from"], EventType.LWOP_START, EventType.LWOP_STOP);
    addDynamicSectionEvents(formDataObject, eventManager, SectionTypes.OVERTIME, ["date", "amount", "rate"], EventType.OVERTIME);
    addDynamicSectionEvents(formDataObject, eventManager, SectionTypes.LUMPSUM, ["date", "amount"], EventType.LUMPSUM);

    //Add start and end events
    eventManager.addEvent(new Event({type: EventType.CA_START, date: CA.startDate}));
    eventManager.addEvent(new Event({type: EventType.START, date: startDate}));
    eventManager.addEvent(new Event({type: EventType.END, date: endDate}));


    eventManager.addAnniversaries(startDate, endDate);

    // Delete all future increments, and create new ones for every future year
    eventManager.getEvents().filter(event => event.type === EventType.PROMOTION).forEach(promotionEvent => {
        console.log("StartProcess::Promotion Event:", promotionEvent);
        const promotionDate = promotionEvent.date;
        eventManager.deleteEvents(event => event.type === EventType.ANNIVERSARY && event.date > promotionDate);
        eventManager.addAnniversaries(promotionDate, endDate);
    });

    // Add *Acting* increments for every period if acting > 1 year
    eventManager.getEvents().filter(event => event.type === EventType.ACTING_START).forEach(actingEvent => {
        console.log("StartProcess::Acting Event:", actingEvent);
        const actingStart = actingEvent.date;
        const actingEndDate = eventManager.getEvents().find(event => event.type === EventType.ACTING_STOP && event.date >= actingStart ).date;
        eventManager.addAnniversaries(actingStart, actingEndDate, EventType.ACTING_ANNIVERSARY);
    });

    // TODO: Probably not needed? just to sort one last time before exiting
    eventManager.events.sort((a, b) => a.date - b.date);
    return eventManager;
}

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
        .sort((a, b) => new Date(a.startDate) - new Date(b.endDate));

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

            rates[period.date].levels = levels;
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

function weekdaysBetween(startDate, endDate) {
    let count = 0;
    // Create new Date objects to avoid modifying the originals
    let currentDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));

    // Loop through dates from startDate to endDate, checking if it's a weekday (Monday to Friday)
    while (currentDate <= endDate) {
        const day = currentDate.getUTCDay();
        if (day !== 0 && day !== 6) { count++; }
        // Move to the next day
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return count;
}


// TODO: Find better name than "calculateNewStep". Has to work for both promotions and actings
// TODO: Figure out how to work with acting periods > 1 year. optional Acting Step, maybe
// https://www.canada.ca/en/public-services-procurement/services/pay-pension/pay-administration/access-update-pay-details/pay-changes-in-your-life/changing-your-employment/acting-position.html
function calculateNewStep(rates, startLevel, startStep, newLevel) {
    const minimumIncrement = rates.annual[newLevel][1] - rates.annual[newLevel][0];
    const minimumNewSalary = rates.annual[startLevel][startStep] + minimumIncrement;
    const newStep = rates.annual[newLevel].findIndex((salary) => salary >= minimumNewSalary);
    return newStep; // TODO: Shortcut this later, left here for now for debugger breakpoint
}

function calculatePayPeriods(CA, events, rates){
    const periodManager = new PeriodManager();

    // Sort events by date to ensure they're processed in the correct order
    events.sort((a, b) => a.date - b.date);

    // If the start date is before the CA then fast-forward to the start of the CA. Anything before that is out of scope.
    const caStartEvent = events.find(event => event.type === EventType.CA_START);
    const startEvent = events.find(event => event.type === EventType.START);
    let actualStart;

    let level = startEvent.level;
    let step = startEvent.step;
    let actingDate = null;
    let actingLevel = null;
    let actingStep = null;
    let effectiveLevel = level;
    let lwopMultiplier = 1;

    if (startEvent.date < caStartEvent.date) {
        // The start date is before the CA start date, fast-forward to the CA start
        actualStart = caStartEvent;

        // Check if there's an acting period that overlaps with the CA start
        const actingStartEvent = events.find(event => event.type === EventType.ACTING_START && event.date <= actualStart.date);
        if (actingStartEvent) {
            const actingEndEvent = findMatchingActingEvent(events, actingStartEvent);
            if (actingEndEvent && actingEndEvent.date >= actualStart.date) {
                actingLevel = actingStartEvent.level;
                actingStep = 0;
                console.log(`calculatePayPeriods::Overlapping Acting Period: Start - ${actingStartEvent.date.toISODateString()}, End - ${actingEndEvent.date.toISODateString()}`);
            }
        }
    } else {
        // Start is after or equal to CA start, just set the actual start to startEvent
        actualStart = startEvent;
    }


    let periodEvents = events.filter(event => event.type !== EventType.OVERTIME && event.type !== EventType.LUMPSUM && event.date >= actualStart.date);
    const endEvent = periodEvents.find(event => event.type === EventType.END);
    if (endEvent) { periodEvents = periodEvents.filter(event => event.date <=  endEvent.date); }

    let i = 0;
    // Gather all events on the same date, process them all, then set the end date to one day before the next event.
    while (i < periodEvents.length -1) {
        const sameDayEvents = [];
        const currentDate = periodEvents[i].date;

        while (i < periodEvents.length && periodEvents[i].date.getTime() === currentDate.getTime()) {
            sameDayEvents.push(periodEvents[i]);
            i++;
        }
        // The end date of this period is one day before the start of the next period.
        let nextEvent = periodEvents[i];
        let thisPeriod = new Period({startDate:currentDate,endDate:nextEvent.date.addTime({days:-1})});
        let currentRate = getApplicableRate(rates, currentDate );
        thisPeriod.rate = currentRate;

        // Sort same-day events by priority. TODO: See if this is still needed
        // sameDayEvents.sort((a, b) => EventPriority[b.type] - EventPriority[a.type]);

        for (let j = 0; j < sameDayEvents.length; j++) {
            const currentEvent = sameDayEvents[j];
            thisPeriod.addType(currentEvent.type);

            // console.log(j, currentEvent, currentRate);
            // The heavy work starts here! TODO: Add logging for each one
            switch(currentEvent.type){
                case EventType.CA_START:
                case EventType.START:
                case EventType.CONTRACTUAL_INCREASE:
                case EventType.FISCAL_NEW_YEAR:
                    // TODO: Nothing actually special needed here ...
                    break;
                case EventType.ANNIVERSARY:
                    if (step < (CA.salaries[level].length -1 )){ step++ }
                    if (actingLevel !== null && step !== ( CA.salaries[level].length - 1 ) ) {
                        actingStep = calculateNewStep(currentRate, level, step, actingLevel);
                    }
                    console.log(`calculatePayPeriods::Anniversary for level ${level}, new step: ${step}, Acting Level: ${actingLevel}, Acting Step: ${actingStep}`);
                    break;
                case EventType.PROMOTION:
                    // TODO: Update the generateEvents to create new anniversaries if acting ends on or just before the promotion date.
                    step = calculateNewStep(currentRate, level, step, currentEvent.level);
                    level = currentEvent.level;
                    console.log(`calculatePayPeriods::Promotion to level ${currentEvent.level}, new step: ${step}`);
                    break
                case EventType.ACTING_START:
                    // TODO: set acting variables
                    actingDate = currentEvent.date;
                    actingLevel = currentEvent.level;
                    actingStep = calculateNewStep(currentRate, level, step, actingLevel);
                    console.log(`calculatePayPeriods::Acting Start - Acting Level: ${actingLevel}, Acting Step: ${actingStep}, Start Date: ${actingDate.toISODateString()}`);
                    break;
                case EventType.ACTING_ANNIVERSARY:
                    if (step === (CA.salaries[level].length-1) && actingStep < ( CA.salaries[actingLevel].length - 1 ) ){
                        actingStep++;
                    }
                    break;
                case EventType.ACTING_STOP:
                    // TODO: Set variables back to substantive values, then fall through to start/contract/fiscal?
                    actingDate = null;
                    actingLevel = null;
                    actingStep = null;
                    break;
                case EventType.LWOP_START:
                    lwopMultiplier = 0;
                    break;
                case EventType.LWOP_STOP:
                    lwopMultiplier = 1;
                    break;
                case EventType.END:
                default:
                    // TODO: Should never get here ...
                    throw new Error(`calculatePayPeriods::Invalid event type?`);
            }
        }
        let salaryDays = weekdaysBetween(currentDate, nextEvent.date);
        thisPeriod.time = salaryDays;
        if (actingLevel !== null && actingLevel !== undefined && actingStep !== null && actingStep !== undefined) {
            thisPeriod.earned = salaryDays * rates["current"].daily[actingLevel][actingStep];
            thisPeriod.owed = salaryDays * currentRate.daily[actingLevel][actingStep];
            thisPeriod.level = actingLevel;
            thisPeriod.step = actingStep;
        } else {
            thisPeriod.earned = salaryDays * rates["current"].daily[level][step];
            thisPeriod.owed = salaryDays * currentRate.daily[level][step];
            thisPeriod.level = level;
            thisPeriod.step = step;
        }
        thisPeriod.earned *= lwopMultiplier;
        thisPeriod.owed *= lwopMultiplier;

        periodManager.addPeriod(thisPeriod);
    }

    // for each one time event, find the matching period and add itself in.
    let oneTimeEvents = events.filter(event => event.type === EventType.OVERTIME || event.type === EventType.LUMPSUM);
    for (let i = 0; i < oneTimeEvents.length; i++){
        const event = oneTimeEvents[i];
        const currentRate = getApplicableRate(rates, event.date );
        const matchingPeriod = periodManager.getPeriodForDate(event.date);
        const matchingLevel = matchingPeriod.level;
        const matchingStep = matchingPeriod.step;

        const oneTimePeriod = new Period({
            type: event.type,
            startDate: event.date,
            endDate: event.date,
            rate: currentRate,
            time: event.amount,
            level: matchingPeriod.level,
            step: matchingPeriod.step
        });


        if (event.type === EventType.OVERTIME){
            oneTimePeriod.earned = event.amount * rates["current"].hourly[matchingLevel][matchingStep] * event.rate;
            oneTimePeriod.owed = event.amount * currentRate.hourly[matchingLevel][matchingStep] * event.rate;
        } else if (event.type === EventType.LUMPSUM){
            oneTimePeriod.earned = event.amount * rates["current"].hourly[matchingLevel][matchingStep];
            oneTimePeriod.owed = event.amount * currentRate.hourly[matchingLevel][matchingStep];
        }

        matchingPeriod.oneTimeEvents.push(oneTimePeriod);
    }

    console.log(`calculatePayPeriods::Finished calculating periods with result:`, periodManager)
    return periodManager;
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
    const startDate = new Date(formDataObject["start-date"]);
    const endDate = new Date(formDataObject["end-date"]);

    if (!CA) {
        CA = data[group][classification][chosenCA];
    }

    let eventManager = generateEvents(formDataObject, CA, startDate, endDate, level);

    let startEvent = eventManager.getEvents().find(event => event.type === EventType.START);
    startEvent.level = level;
    startEvent.step = step;

    console.log("StartProcess::Generated events:", eventManager);

    let rates = generateRates(CA);
    console.log(`StartProcess::Rates:${rates}`);
    generateRateTables(rates);

    let periods = calculatePayPeriods(CA, eventManager.getEvents(), rates);

    generatePayTables(periods.getPeriods());

    return false;
}

// Export the StartProcess function
export { StartProcess };
console.log("Finished loading backpayCalc.js");