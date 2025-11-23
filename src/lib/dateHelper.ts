import moment from "moment";

export const getNextWeekDates = () => {
  const monday = moment().startOf("isoWeek").add(7, "days");
  return [...Array(5)].map((_, i) =>
    monday.clone().add(i, "days").format("YYYY-MM-DD")
  );
};
