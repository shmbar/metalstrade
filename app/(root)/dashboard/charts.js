function addCommas(x) {
    var parts = Math.round(x).toString().split('.');
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function checkIfInArray(values) {
    const arr = [3, 5.5];
    const sumOfY_axe = values.map(x => x.value).reduce((a, b) => a + b, 0) //array is included in array
    return arr.indexOf(sumOfY_axe) !== -1
}

// Line Chart for Sales Overview - Using Site Color Palette
export const LineChart = (data1, data2) => {
    const obj = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: 'Total Sales',
                data: data1,
                borderColor: '#9fb8d4', // rock-blue
                backgroundColor: 'transparent',
                borderWidth: 2.5,
                tension: 0.4,
                fill: false,
                pointRadius: 4,
                pointBackgroundColor: '#9fb8d4',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#9fb8d4',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            },
            {
                label: 'Total Revenue',
                data: data2,
                borderColor: '#103a7a', // chathams-blue
                backgroundColor: 'transparent',
                borderWidth: 2.5,
                tension: 0.4,
                fill: false,
                pointRadius: 4,
                pointBackgroundColor: '#103a7a',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#103a7a',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            },
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#28264f', // port-gore
                bodyColor: '#838ca7', // regent-gray
                borderColor: '#ebf2fc', // selago
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return context.dataset.label + ': $' + addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins', weight: 'bold' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        scales: {
            y: {
                border: {
                    display: false,
                },
                beginAtZero: true,
                max: 100,
                ticks: {
                    stepSize: 20,
                    callback: function (value) {
                        return value;
                    },
                    font: { family: 'Poppins', size: 11 },
                    color: '#838ca7', // regent-gray
                    padding: 10,
                },
                grid: {
                    color: 'rgba(159, 184, 212, 0.3)', // rock-blue with opacity
                    drawBorder: false,
                }
            },
            x: {
                ticks: { 
                    font: { family: 'Poppins', size: 11 }, 
                    color: '#838ca7', // regent-gray
                    padding: 5,
                },
                grid: {
                    display: false,
                },
                border: {
                    display: false,
                }
            }
        },
    };

    return { obj, options };
};

// Grouped Bar Chart for Total Revenue - Using Site Color Palette  
export const GroupedBarChart = (data1, data2) => {
    const obj = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: 'Total Income',
                backgroundColor: '#9fb8d4', // rock-blue
                data: data1,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.7,
                categoryPercentage: 0.6,
            },
            {
                label: 'Total Outcome',
                backgroundColor: '#103a7a', // chathams-blue
                data: data2,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.7,
                categoryPercentage: 0.6,
            },
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#28264f', // port-gore
                bodyColor: '#838ca7', // regent-gray
                borderColor: '#ebf2fc', // selago
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return context.dataset.label + ': $' + addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins', weight: 'bold' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    display: false,
                },
                beginAtZero: true,
                max: 100,
                ticks: {
                    stepSize: 20,
                    callback: function (value) {
                        return value;
                    },
                    font: { family: 'Poppins', size: 11 },
                    color: '#838ca7', // regent-gray
                    padding: 10,
                },
                grid: {
                    color: 'rgba(159, 184, 212, 0.3)', // rock-blue with opacity
                    drawBorder: false,
                }
            },
            x: {
                ticks: { 
                    font: { family: 'Poppins', size: 11 }, 
                    color: '#838ca7', // regent-gray
                    padding: 5,
                },
                grid: {
                    display: false,
                },
                border: {
                    display: false,
                }
            }
        },
    };

    return { obj, options };
};

// Small Line Chart for stat cards - animated thick line
export const LineChartSmall = (data, color) => {
    const obj = {
        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        datasets: [
            {
                data: data,
                borderColor: color,
                backgroundColor: 'transparent',
                borderWidth: 3,
                tension: 0.4,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            },
        ]
    };

    const options = {
        animation: {
            duration: 1500,
            easing: 'easeInOutQuart',
        },
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#28264f',
                bodyColor: '#28264f',
                borderColor: '#ebf2fc',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                callbacks: {
                    label: function (context) {
                        return '$' + addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins', weight: 'bold' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        scales: {
            y: {
                display: false,
                beginAtZero: true,
            },
            x: {
                display: false,
            }
        },
    };

    return { obj, options };
};

export const BarChart = (data, color) => {

    const obj = {
        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        datasets: [
            {
                //label: 2021,//date.year,
                backgroundColor: color,
                hoverBackgroundColor: '#0366ae',
                data: data,
                borderRadius: 4,
                borderSkipped: false,
            },
        ]
    };

    const options = {
        animation: {
            duration: 1200,
            easing: 'easeOutQuart',
            delay: (context) => {
                return context.dataIndex * 60;
            },
        },
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#28264f',
                bodyColor: '#28264f',
                borderColor: '#ebf2fc',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                callbacks: {
                    label: function (context) {
                        return '$' + addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins', weight: 'bold' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    display: false,
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        const YesNo = checkIfInArray(values)
                        return YesNo ? 0 : value / 1000000;
                    },
                    font: { family: 'Poppins', size: 11 },
                    color: '#838ca7'
                },
                grid: {
                    color: 'rgba(159, 184, 212, 0.2)',
                    drawBorder: false,
                }
            },
            x: {
                ticks: { font: { family: 'Poppins', size: 11 }, color: '#838ca7' },
                grid: {
                    display: false
                },
                border: {
                    display: false,
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
                hoverBackgroundColor: '#0366ae',
                data: data,
                borderRadius: 4,
                borderSkipped: false,
            },
            {
                stack: 'Stack 0',
                backgroundColor: color1,
                hoverBackgroundColor: '#9fb8d4',
                data: data1,
                borderRadius: 4,
                borderSkipped: 'start',
            },

        ]
    };

    const options = {
        animation: {
            duration: 1200,
            easing: 'easeOutQuart',
            delay: (context) => {
                return context.dataIndex * 60;
            },
        },
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#28264f',
                bodyColor: '#28264f',
                borderColor: '#ebf2fc',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                callbacks: {
                    label: function (context) {
                        return '$' + addCommas(context.parsed.y.toString())
                    }
                },
                titleFont: { family: 'Poppins', weight: 'bold' },
                bodyFont: { family: 'Poppins' },
            },
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    display: false,
                },
                beginAtZero: true,
                ticks: {
                    callback: function (value, index, values) {
                        const YesNo = checkIfInArray(values)
                        return YesNo ? 0 : value / 1000000;
                    },
                    font: { family: 'Poppins', size: 11 },
                    color: '#838ca7'
                },
                grid: {
                    color: 'rgba(159, 184, 212, 0.2)',
                    drawBorder: false,
                }
            },
            x: {
                ticks: { font: { family: 'Poppins', size: 11 }, color: '#838ca7' },
                grid: {
                    display: false
                },
                border: {
                    display: false,
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

    // Generate gradient colors based on site color palette
    const generateGradientColors = (length) => {
        const colors = [
            '#103a7a', // chathams-blue
            '#0366ae', // endeavour
            '#9fb8d4', // rock-blue
            '#28264f', // port-gore
            '#1c134d', // bunting
            '#838ca7', // regent-gray
        ];
        return Array.from({ length }, (_, i) => colors[i % colors.length]);
    };

    const obj = {
        labels: arrNames,
        datasets: [{
            data: arrNums,
            borderRadius: 8,
            borderSkipped: false,
            backgroundColor: generateGradientColors(arrNums.length),
            hoverBackgroundColor: '#0366ae',
        }]
    };


    const options = {
        indexAxis: 'y',
        animation: {
            duration: 1200,
            easing: 'easeOutQuart',
            delay: (context) => {
                return context.dataIndex * 100;
            },
        },
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#28264f',
                bodyColor: '#838ca7',
                borderColor: '#ebf2fc',
                borderWidth: 1,
                cornerRadius: 10,
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return context.label + ': $' + addCommas(context.parsed.x.toString())
                    },
                },
                titleFont: { family: 'Poppins', weight: 'bold' },
                bodyFont: { family: 'Poppins' },
            }
        },
        maintainAspectRatio: false,
        scales: {
            y: {
                border: {
                    display: false,
                },
                beginAtZero: true,
                ticks: {
                    font: { family: 'Poppins', size: 11 },
                    color: '#28264f'
                },
                grid: {
                    display: false
                }
            },
            x: {
                ticks: { 
                    font: { family: 'Poppins', size: 11 }, 
                    color: '#838ca7',
                    callback: function (value) {
                        if (value >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M';
                        } else if (value >= 1000) {
                            return (value / 1000).toFixed(0) + 'K';
                        }
                        return value;
                    }
                },
                grid: {
                    color: 'rgba(159, 184, 212, 0.2)',
                },
                border: {
                    display: false,
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
