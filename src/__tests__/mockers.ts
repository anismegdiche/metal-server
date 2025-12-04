


export function mock_Logger() {
    // Mock dependencies
    jest.doMock('../utils/Logger', () => ({
        Logger: {
            SetLevel: () => () => { },
            EnableAll: () => () => { },
            DisableAll: () => () => { },
            Log: () => () => { },
            Error: () => () => { },
            Warn: () => () => { },
            Debug: () => () => { },
            Info: () => () => { },
            Message: () => () => { },
            LogFunction: () => () => { },
            Level: "error",
            Out: 'OUT'
        }
    }))
}