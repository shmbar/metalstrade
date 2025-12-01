function addCommas(x) {
    var parts = Math.round(x).toString().split('.');
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

///////////////////////////////

function checkIfInArray(values) {
    const arr = [3, 5.5];
    const sumOfY_axe = values.map(x => x.value).reduce((a, b) => a + b, 0) //array is included in array
    return arr.indexOf(sumOfY_axe) !== -1
}

export const BarChart = (data, color) => {

    const obj = {
        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        datasets: [
            {
                //label: 2021,//date.year,
                backgroundColor: color,
                data: data,
                //   borderRadius: 5,
                //     borderSkipped: 'start',
            },
        ]
    };

    const options = {
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: false,
                //	position: 'bottom',
                //	labels: {font: {family: 'Poppins'}},
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return '$' + addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    color: 'silver',
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        const YesNo = checkIfInArray(values)
                        return YesNo ? 0 : value / 1000000;    //addCommas(value/1000); //(value/1000).toFixed(1) //
                    },
                    font: { family: 'Poppins' },
                    color: 'gray'
                },
                grid: {
                    display: false
                }
            },
            x: {
                ticks: { font: { family: 'Poppins' }, color: 'gray' },
                grid: {
                    display: false
                },
                border: {
                    color: 'silver',
                }
            }
        },
    };

    return { obj, options };
}

export const BarChartContracts = (data, data1, color, color1) => {

    const obj = {
        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        datasets: [
            {
                stack: 'Stack 0',
                backgroundColor: color,
                data: data,//Object.values(dtCrnt),
                //    borderRadius: 5,
                //    borderSkipped: false,
            },
            {
                stack: 'Stack 0',
                backgroundColor: color1,
                data: data1,
                //     borderRadius: 5,
                //     borderSkipped: 'start',
            },

        ]
    };

    const options = {
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: false,
                //	position: 'bottom',
                //	labels: {font: {family: 'Poppins'}},
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return '$' + addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    color: 'silver',
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        const YesNo = checkIfInArray(values)
                        return YesNo ? 0 : value / 1000000;    //addCommas(value/1000); //(value/1000).toFixed(1) //
                    },
                    font: { family: 'Poppins' },
                    color: 'gray'
                },
                grid: {
                    display: false
                }
            },
            x: {
                ticks: { font: { family: 'Poppins' }, color: 'gray' },
                grid: {
                    display: false
                },
                border: {
                    color: 'silver',
                }
            }
        },
    };

    return { obj, options };
}

export const HorizontalBar = (arr, text) => {
    let arrNums = {}
    let arrNames = {}
    if (arr instanceof Object) {
        arrNums = Object.values(arr)
        arrNames = Object.keys(arr)
    } else {
        arrNums = []
        arrNames = []
    }


    const getRandomColor = () => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `rgba(${r}, ${g}, ${b}, 0.7)`; // 0.7 = transparency
    };

    const generateRandomColors = (length) => {
        return Array.from({ length }, getRandomColor);
    };

    const obj = {
        labels: arrNames,
        datasets: [{
            data: arrNums,
            borderRadius: 5,
            borderSkipped: false,
            backgroundColor: generateRandomColors(arrNums.length),
        }]
    };


    const options = {
        indexAxis: 'y',
        plugins: {
            title: {
                display: false,
                //     text: text,
                //    font: { size: 16, family: 'Poppins' },
            },
            legend: {
                display: false,
                //     position: 'left',
                //     labels: { font: { family: 'Poppins' } },
            },

            tooltip: {
                callbacks: {
                    label: function (context) {
                        return context.label + ': $' + addCommas(context.parsed.x.toString())
                    },
                },
                titleFont: { family: 'Poppins' },
                bodyFont: { family: 'Poppins' },
            }
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    color: 'silver',
                },
                beginAtZero: true,
                // ticks: {
                //     callback: function (value, index, values) {
                //         const YesNo = checkIfInArray(values)
                //         return YesNo ? 0 : value / 1000;    //addCommas(value/1000); //(value/1000).toFixed(1) //
                //     },
                //     font: { family: 'Poppins' },
                //     color: 'gray'
                // },
                grid: {
                    display: false
                }
            },
            x: {
                ticks: { font: { family: 'Poppins' }, color: 'gray' },
                grid: {
                    display: false
                },
                border: {
                    color: 'silver',
                }
            }
        },
    };

    return { obj, options };

}



export const ExpCompare = (dtCrnt, dtCrntPrev, date, cur) => {
    const obj = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: date.year,
                backgroundColor: 'white', //'#45afed',
                data: Object.values(dtCrnt),
                borderRadius: 10,
                borderSkipped: false,
            },
            {
                label: date.year - 1,
                backgroundColor: '#999999',
                data: Object.values(dtCrntPrev),
                borderRadius: 10,
                borderSkipped: false,
            }
        ]
    }

    const options = {
        plugins: {
            title: {
                display: true,
                text: `Expenses - K (${cur})`,
                font: { size: 16, family: 'Poppins' },
                color: 'white'
            },
            legend: {
                display: false,
                //	position: 'bottom',
                //	labels: {font: {family: 'Poppins'}},
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    color: 'silver',
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        const YesNo = checkIfInArray(values)
                        return YesNo ? 0 : value / 1000;    //addCommas(value/1000); //(value/1000).toFixed(1) //
                    },
                    font: { family: 'Poppins' },
                    color: 'white',
                },
                grid: {
                    display: false,
                }
            },
            x: {
                ticks: { font: { family: 'Poppins' }, color: 'white' },
                grid: {
                    display: false,
                },
                border: {
                    color: 'silver',
                }
            }
        }
    };

    return { obj, options }

}

//////////////////////////////////////////////////

export const RevenueCompare = (dtCrnt, dtPrev, dtCrnt1, dtPrev1, date, cur) => {

    const obj = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: date.year + ' Rev',
                stack: 'Stack 0',
                backgroundColor: 'white',
                data: Object.values(dtCrnt),
                borderRadius: 10,
                borderSkipped: false,
            },
            {
                label: date.year + ' Ex Rev',
                stack: 'Stack 0',
                backgroundColor: 'silver',
                data: Object.values(dtCrnt1),
                borderRadius: 10,
                borderSkipped: false,
            },
            {
                label: date.year - 1 + ' Rev',
                stack: 'Stack 1',
                backgroundColor: '#999999',
                data: Object.values(dtPrev),
                borderRadius: 10,
                borderSkipped: false,

            },
            {
                label: date.year - 1 + ' Ex Rev',
                stack: 'Stack 1',
                backgroundColor: '#D5D5D5',
                data: Object.values(dtPrev1),
                borderRadius: 10,
                borderSkipped: false,
            }
        ]
    };

    const options = {
        plugins: {
            title: {
                display: true,
                text: `Revenue - K (${cur})`,
                font: { size: 16, family: 'Poppins' },
                color: 'white',
            },
            legend: {
                display: false,
                //	position: 'bottom',
                //	labels: {font: {family: 'Poppins'}},
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return addCommas(context.parsed.y.toString())
                    },
                },
                titleFont: { family: 'Poppins' },
                bodyFont: { family: 'Poppins' },
            }
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    color: 'silver',
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        const YesNo = checkIfInArray(values)
                        return YesNo ? 0 : value / 1000;    //addCommas(value/1000); //(value/1000).toFixed(1) //
                    },
                    font: { family: 'Poppins' },
                    color: 'white',
                },
                grid: {
                    display: false
                }
            },
            x: {
                border: {
                    color: 'silver',
                },
                ticks: { font: { family: 'Poppins' }, color: 'white', },
                grid: {
                    display: false
                }
            }
        },
    };

    return { obj, options };

}

/////////////////////////////////////////////////////////////////////////////////////

export const PLCompare = (dtCrnt, dtPrev, date, cur) => {

    const obj = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: date.year,
                backgroundColor: 'white',
                data: Object.values(dtCrnt),
                borderRadius: 10,
                borderSkipped: false,
            },
            {
                label: date.year - 1,
                backgroundColor: '#999999',
                data: Object.values(dtPrev),
                borderRadius: 10,
                borderSkipped: false,
            }
        ]
    };

    const options = {
        plugins: {
            title: {
                display: true,
                text: `P&L - K (${cur})`,
                font: { size: 16, family: 'Poppins' },
                color: 'white'
            },
            legend: {
                display: false,
                //	position: 'bottom',
                //	labels: {font: {family: 'Poppins'}},
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    color: 'silver',
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        const YesNo = checkIfInArray(values)
                        return YesNo ? 0 : value / 1000;    //addCommas(value/1000); //(value/1000).toFixed(1) //
                    },
                    font: { family: 'Poppins' },
                    color: 'white'
                },
                grid: {
                    display: false
                }
            },
            x: {
                ticks: { font: { family: 'Poppins' }, color: 'white' },
                grid: {
                    display: false
                },
                border: {
                    color: 'silver',
                }
            }
        },
    };

    return { obj, options };

}

//////////////////////////////////////////////////////////////////////////

export const ExpenseGroup = (expensesTitles, ExpGroup, lblType, cur) => {

    let exOwnerGraphLabels = ['Insurance', 'Taxes & Fees', 'Maintenance', 'S&M', 'G&A', 'Supplies', 'P&C Fees', 'Utilities', 'Management', 'Other'];
    let exCompanyGraphLabels = ['Insurance', 'Taxes & Fees', 'Maintenance', 'S&M', 'G&A', 'Supplies', 'P&C Fees', 'Utilities', 'Management', 'Rent', 'Other'];

    const obj = {
        labels: lblType === 1 ? exOwnerGraphLabels : exCompanyGraphLabels,  //rent??
        labelsFull: expensesTitles,
        datasets: [
            {
                label: 'Value',
                backgroundColor: '#45afed',
                data: Object.values(ExpGroup),
                borderRadius: 10,
                borderSkipped: false,
            },
        ]
    };

    const options = {
        plugins: {
            title: {
                display: true,
                text: `Expenses by Group - K (${cur})`,
                font: { size: 16, family: 'Poppins' }
            },
            legend: {
                display: false,
                labels: { font: { family: 'Poppins' } },
            },
            tooltip: {
                callbacks: {
                    title: function (context) {
                        return expensesTitles[context[0].dataIndex]; //d.labels[t[0].index];
                    },
                    label: function (context) {
                        return addCommas(context.parsed.y.toString())
                    },

                },
                titleFont: { family: 'Poppins' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        const YesNo = checkIfInArray(values)
                        return YesNo ? 0 : value / 1000;    //addCommas(value/1000); //(value/1000).toFixed(1) //
                    },
                    font: { family: 'Poppins' },
                },
                grid: {
                    display: false
                }
            },
            x: {
                ticks: { font: { family: 'Poppins' }, },
                grid: {
                    display: false
                }
            }
        },
    };


    return { obj, options };
}

/////////////////////////////////////////////////////////////////////////////


export const OccupPrcnt = (dtCrnt, dtCrntPrev, date) => {

    const obj = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: date.year,
                backgroundColor: '#45afed',
                data: Object.values(dtCrnt),
                borderRadius: 10,
                borderSkipped: false,
            },
            {
                label: date.year - 1,
                backgroundColor: '#999999',
                data: Object.values(dtCrntPrev),
                borderRadius: 10,
                borderSkipped: false,
            }
        ]
    };


    const options = {
        plugins: {
            title: {
                display: true,
                text: `Properties Occupancy`,
                font: { size: 16, family: 'Poppins' }
            },
            legend: {
                position: 'bottom',
                labels: { font: { family: 'Poppins' } },
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return context.parsed.y.toString() + '%'
                    }
                },
                titleFont: { family: 'Poppins' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        return value + '%';
                    },
                    font: { family: 'Poppins' },
                },
                max: 100,
                grid: {
                    display: false
                }
            },
            x: {
                ticks: { font: { family: 'Poppins' }, },
                grid: {
                    display: false
                }
            }
        },
    };

    return { obj, options };
}
