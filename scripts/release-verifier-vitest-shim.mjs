const tests = []
const afterEachHooks = []
const suiteNames = []

function formatValue(value) {
  return JSON.stringify(value)
}

function formatEachName(name, values) {
  let valueIndex = 0

  return name.replace(/%[sdifjoO]/g, () => String(values[valueIndex++]))
}

function registerTest(name, callback) {
  tests.push({ name: [...suiteNames, name].join(' > '), callback })
}

export function describe(name, callback) {
  suiteNames.push(name)
  try {
    callback()
  } finally {
    suiteNames.pop()
  }
}

export function afterEach(callback) {
  afterEachHooks.push(callback)
}

export function it(name, callback) {
  registerTest(name, callback)
}

it.each = (rows) => (name, callback) => {
  for (const row of rows) {
    const values = Array.isArray(row) ? row : [row]
    registerTest(formatEachName(name, values), () => callback(...values))
  }
}

export function expect(actual) {
  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(message)
    }
  }

  const matchers = {
    toBe(expected) {
      assert(
        Object.is(actual, expected),
        `Expected ${formatValue(actual)} to be ${formatValue(expected)}.`,
      )
    },
    toContain(expected) {
      assert(
        actual?.includes?.(expected),
        `Expected ${formatValue(actual)} to contain ${formatValue(expected)}.`,
      )
    },
  }

  return {
    ...matchers,
    not: {
      toContain(expected) {
        assert(
          !actual?.includes?.(expected),
          `Expected ${formatValue(actual)} not to contain ${formatValue(expected)}.`,
        )
      },
    },
  }
}

export async function runRegisteredTests() {
  let failedTests = 0

  for (const test of tests) {
    let failure

    try {
      await test.callback()
    } catch (error) {
      failure = error
    }

    for (const hook of afterEachHooks) {
      try {
        await hook()
      } catch (error) {
        failure ??= error
      }
    }

    if (failure) {
      failedTests += 1
      console.error(
        `[FAIL] ${test.name}: ${failure instanceof Error ? failure.message : String(failure)}`,
      )
      continue
    }

    console.log(`[PASS] ${test.name}`)
  }

  if (failedTests > 0) {
    throw new Error(`${failedTests} release verifier test${failedTests === 1 ? '' : 's'} failed.`)
  }

  console.log(`[INFO] ${tests.length} release verifier tests passed.`)
}
