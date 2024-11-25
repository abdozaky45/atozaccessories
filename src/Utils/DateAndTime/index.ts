import moment, { Moment } from 'moment-timezone';

moment.tz.setDefault('Africa/Cairo');

const StartOfDay = (now: Moment): number => now.clone().startOf('day').valueOf();

const EndOfDay = (now: Moment): number => now.clone().endOf('day').valueOf();

const StartOfWorkDay = (now: Moment): number => now.clone().set({ hour: 9, minute: 0, second: 0 }).valueOf();

const EndOfWorkDay = (now: Moment): number => now.clone().set({ hour: 17, minute: 0, second: 0 }).valueOf();

const StartOfInterviewHour = (now: Moment, hour: number): number => now.clone().set({ hour, minute: 0, second: 0 }).valueOf();

const EndOfInterviewHour = (now: Moment, hour: number): number => now.clone().set({ hour, minute: 0, second: 0 }).valueOf();

const StartOfMonth = (now: Moment): number => now.clone().startOf('month').valueOf();

const EndOfMonth = (now: Moment): number => now.clone().endOf('month').valueOf();

const StartOfLastMonth = (now: Moment): number => now.subtract(1, 'months').startOf('month').valueOf();

const EndOfLastMonth = (now: Moment): number => now.subtract(1, 'months').endOf('month').valueOf();

const StartOfYear = (now: Moment): number => now.clone().startOf('year').valueOf();
const EndOfYear = (now: Moment): number => now.clone().endOf('year').valueOf();

const CheckIsLateTime = (now: Moment) => {
    const day = now.day();
    if (day === 5 || day === 6)
        return false
    return now.valueOf() > now.clone().set({ hour: 9, minute: 10, second: 0 }).valueOf();
}


const AfterDays = (now: Moment, days: number): number => now.clone().set({ hour: 17, minute: 0, second: 0 }).add(days, 'days').valueOf();


export default moment;
export {
    StartOfDay, EndOfDay, StartOfMonth, EndOfMonth, CheckIsLateTime, AfterDays, StartOfWorkDay, EndOfWorkDay,
    StartOfInterviewHour, EndOfInterviewHour, StartOfLastMonth, EndOfLastMonth, StartOfYear, EndOfYear
}
