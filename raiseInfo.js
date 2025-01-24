// data.js
// -- Usage guide --
// startDate must have the same date value as the first Contractual Increase period.
// Increments must either be one number, or one number for *every* level.
//

const data = {
    "IT Group": {
        "IT": {
            "2018-2021": {
                "startDate": "2018-12-22",
                "endDate": "2021-03-17", /* TODO: this probably shouldn't be used, allow any arbitrary date in the future */
                "hoursPerWeek":37.5,
                "salaries": [
                    [56907, 59011, 61111, 63200, 65288, 67375, 69461, 73333],
                    [70439, 72694, 74947, 77199, 79455, 81706, 83960, 86213],
                    [83147, 86010, 88874, 91740, 94602, 97462, 100325, 103304],
                    [95201, 98485, 101766, 105050, 108331, 111613, 114896, 118499],
                    [108528, 112574, 116618, 120665, 124712, 128759, 132807, 136852, 141426]
                ],
                "periods": [
                    {"date": "2018-12-22", "type": "Contractual Increase", "increments": [2.816]},
                    {"date": "2019-04-01", "type": "Fiscal New Year"},
                    {"date": "2019-12-22", "type": "Contractual Increase", "increments": [2.204]},
                    {"date": "2020-04-01", "type": "Fiscal New Year" },
                    {"date": "2020-12-22", "type": "Contractual Increase", "increments": [1.50]},
                    {"date": "2021-02-26", "type": "Contract Signed"}
                ]
            },
            "2021-2025": {
                "startDate": "2021-12-22",
                "endDate": "2024-03-17",
                "hoursPerWeek":37.5,
                "salaries": [
                        [60696, 62940, 65180, 67408, 69634, 71861, 74086, 78216],
                        [75129, 77535, 79937, 82340, 84745, 87147, 89551, 91953],
                        [88683, 91737, 94792, 97848, 100901, 103951, 107005, 110182],
                        [101541, 105042, 108542, 112044, 115545, 119045, 122545, 126390],
                        [115754, 120070, 124383, 128699, 133016, 137333, 141648, 145964, 150842]
                    ],
                "periods": [
                    { "date": "2021-12-22", "type": "Contractual Increase", "increments": [3.022, 3.022, 3.022, 3.022, 4.037] },
                    { "date": "2022-04-01", "type": "Fiscal New Year"},
                    { "date": "2022-12-22", "type": "Contractual Increase", "increments": [4.79375, 4.79375, 4.79375, 4.79375, 4.7944]},
                    { "date": "2023-04-01", "type": "Fiscal New Year"},
                    { "date": "2023-12-22", "type": "Contractual Increase", "increments": [3.515]},
                    { "date": "2024-02-26", "type": "Contract Signed"},
                    { "date": "2024-04-01", "type": "Fiscal New Year"},
                    { "date": "2024-12-22", "type": "Contractual Increase", "increments": [2.255]},
                    { "date": "2025-04-01", "type": "Fiscal New Year"}
                ]
            }
        }
    },
    "CFIA-IN Group": {
        "CS": {
            "2021-2025": {
                "startDate": "2021-06-01",
                "endDate": "2025-06-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [61649, 63897, 66147, 68378, 70606, 72833, 75062, 78834],
                        [76647, 79052, 81466, 83875, 86281, 88688, 91094, 93501],
                        [90443, 93501, 96563, 99620, 102686, 105746, 108807, 111865],
                        [103798, 107304, 110813, 114317, 117829, 121337, 124848, 128357],
                        [118492, 122816, 127138, 131464, 135791, 140109, 144428, 148750, 153073]
                    ],
                "periods": [
                    { "date": "2022-06-01", "type": "Contractual Increase", "increments": [6.366]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-06-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-06-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-06-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        }
    },
    "CFIA-S&A Group": {
        "CO": {
            "2021-2025": {
                "startDate": "2021-10-01",
                "endDate": "2025-10-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [57421, 60136, 62841, 68378, 65554, 68259, 70976, 73687, 76389, 79488],
                        [74852, 78752, 82649, 86550, 90443, 94343, 98237, 102148, 106039, 110474],
                        [91743, 96086, 100422, 104761, 109099, 113439, 117519, 122193],
                        [104739, 109480, 114176, 114317, 118590, 121337, 127411, 132464],
                    ],
                "periods": [
                    { "date": "2022-10-01", "type": "Contractual Increase", "increments": [4.79375]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-10-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-10-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-10-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        },
        "EN-ENG": {
            "2021-2025": {
                "startDate": "2021-10-01",
                "endDate": "2025-10-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [48158, 57776, 59922],
                        [60019, 62529, 65224, 67730, 70233, 72851],
                        [72511, 75561, 78705, 81835, 84968, 88103, 94635],
                        [85138, 88544, 91943, 95346, 98754, 102155, 105240],
                        [97682, 101659, 105616, 109592, 113563, 117544, 125044],
                        [109376, 113591, 117806, 122030, 126256, 130476, 135326]
                    ],
                "periods": [
                    { "date": "2022-10-01", "type": "Contractual Increase", "increments": [4.79375]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-10-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-10-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-10-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        },
        "ES": {
            "2021-2025": {
                "startDate": "2021-10-01",
                "endDate": "2025-10-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [33347, 61740, 64035, 64677],
                        [60863, 62840, 64540, 66792, 69279, 71358],
                        [69525, 72238, 74927, 77657, 80383, 83373, 85873],
                        [86480, 89521, 92567, 95588, 98293, 102225],
                        [98155, 101209, 105034, 108813, 112861, 116249],
                        [114398, 118119, 121700, 126226, 130012],
                        [124495, 128110, 131730, 135042, 140444]
                    ],
                "periods": [
                    { "date": "2022-10-01", "type": "Contractual Increase", "increments": [4.79375]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-10-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-10-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-10-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        },
        "PO": {
            "2021-2025": {
                "startDate": "2021-10-01",
                "endDate": "2025-10-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [35692, 37990, 40302, 42604, 44904, 47193, 49500, 51797, 54097, 56405, 58702, 62067],
                        [58984, 61602, 64226, 66845, 70668],
                        [65639, 68582, 71506, 74427, 78691],
                        [77500, 80956, 84423, 88328, 93413],
                        [91199, 95292, 99383, 103218, 108091],
                        [102877, 104972, 106907, 108851, 110795, 112723, 117730],
                    ],
                "periods": [
                    { "date": "2022-10-01", "type": "Contractual Increase", "increments": [4.79375]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-10-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-10-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-10-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        },
        "SE-RES": {
            "2021-2025": {
                "startDate": "2021-10-01",
                "endDate": "2025-10-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [59805, 62949, 66095, 69245, 72393, 75535, 78684, 81759],
                        [74256, 78887, 83503, 88128, 92750, 97370, 101993, 106617, 111238, 115583],
                        [93844, 97546, 101250, 104950, 108659, 112365, 116069, 119768, 123475, 128256],
                        [112385, 116500, 120610, 124723, 128838, 132958, 137057, 142401],
                        [123056, 127566, 132065, 136567, 141072, 145572, 150078, 155883],
                    ],
                "periods": [
                    { "date": "2022-10-01", "type": "Contractual Increase", "increments": [4.79375]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-10-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-10-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-10-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        },
        "SE-REM": {
            "2021-2025": {
                "startDate": "2021-10-01",
                "endDate": "2025-10-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [96223, 99943, 103665, 107389, 111112, 114831, 118556, 122274, 126002, 129405],
                        [110952, 114714, 118476, 122246, 126002, 129762, 133527, 137291, 141048, 144493],
                    ],
                "periods": [
                    { "date": "2022-10-01", "type": "Contractual Increase", "increments": [4.79375]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-10-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-10-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-10-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        },
        "SR": {
            "2021-2025": {
                "startDate": "2021-10-01",
                "endDate": "2025-10-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [60103, 61321, 63696, 66069, 68453, 70829, 73607, 75519],
                        [67140, 70017, 72918, 75796, 78683, 81574, 84456, 87024, 89635],
                        [83339, 86811, 90287, 93753, 96941, 99817, 104778, 106319],
                        [98216, 101882, 105536, 109201, 112546, 115922, 117290, 121711],
                        [111727, 115777, 119692, 123289, 126883, 129408, 132837],
                    ],
                "periods": [
                    { "date": "2022-10-01", "type": "Contractual Increase", "increments": [4.79375]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-10-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-10-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-10-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        }
    },
    "CFIA-VM Group": {
        "VM": {
            "2021-2025": {
                "startDate": "2021-06-01",
                "endDate": "2025-06-01",
                "hoursPerWeek":37.5,
                "salaries": [
                        [82063, 85258, 88472, 92008, 95545, 99085],
                        [95616, 99219, 102822, 106934, 111047, 115164],
                        [103401, 107345, 111284, 115736, 120186, 124635],
                        [113150, 116638, 119696, 124480, 129266, 134058],
                        [123594, 127057, 130519, 135744, 140964, 146189]
                    ],
                "periods": [
                    { "date": "2022-06-01", "type": "Contractual Increase", "increments": [4.79375]},
                    { "date": "2023-04-01", "type": "Fiscal New Year" },
                    { "date": "2023-06-01", "type": "Contractual Increase", "increments": [3.515], },
                    { "date": "2024-04-01", "type": "Fiscal New Year" },
                    { "date": "2024-06-01", "type": "Contractual Increase", "increments": [2.255], },
                    { "date": "2024-10-01", "type": "Contract Signed" },
                    { "date": "2025-04-01", "type": "Fiscal New Year" },
                    { "date": "2025-06-01", "type": "Contractual Increase", "increments": [2] },
                    { "date": "2026-04-01", "type": "Fiscal New Year" }
                ],
            }
        }
    },
};

// Convert startDate and endDate strings to Javascript Date objects before exporting this for use by other modules
function processDates(data) {
    for (const groupKey in data) {
        const group = data[groupKey];
        for (const classificationKey in group) {
            const classification = group[classificationKey];
            for (const caKey in classification) {
                const ca = classification[caKey];
                if (ca.startDate) { ca.startDate = new Date(ca.startDate); }
                if (ca.endDate) { ca.endDate = new Date(ca.endDate); }
                ca.levels = ca.salaries.length;
            }
        }
    }
}

processDates(data);

// Export the data object so it can be imported elsewhere
export {data};
