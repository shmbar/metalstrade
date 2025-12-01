
// Defining the dateBetweenFilterFn
export const dateBetweenFilterFn = (row, columnId, value) => {
  const date = row.getValue(columnId); // Assuming date is a Date object
  const [start, end] = value; // value => two date input values

 
  // If one filter is defined and date is null, filter it
  if ((start || end) && !date) return false;

  if (start && !end) {
    return date >= start;
  } else if (!start && end) {
    return date <= end;
  } else if (start && end) {
    return date >= start && date <= end;
  } else return true;
 
};


dateBetweenFilterFn.autoRemove;

export default dateBetweenFilterFn;