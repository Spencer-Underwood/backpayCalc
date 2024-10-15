// data.js
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
    }
};

// Export the data object so it can be imported elsewhere
export {data};
