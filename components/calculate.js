import { evaluate, round } from 'mathjs'

export const CalculateNum = (num, dgts) => {
    return num.substr(0, 1) === "=" ? round(evaluate(num.slice(1)), dgts) : num
}
