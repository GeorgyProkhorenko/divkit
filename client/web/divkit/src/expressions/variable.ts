import { writable } from 'svelte/store';
import type { Subscriber, Unsubscriber, Writable } from 'svelte/types/runtime/store';
import type { EvalValue } from './eval';
import { MAX_INT, MIN_INT } from './const';
import { parseColor } from '../utils/correctColor';

export type VariableType = 'string' | 'number' | 'integer' | 'boolean' | 'color' | 'url';
export type VariableValue = string | number | boolean;

export abstract class Variable<ValueType = any, TypeName = VariableType> {
    protected name: string;
    protected value: ValueType;
    protected store?: Writable<ValueType>;

    constructor(name: string, value: ValueType) {
        const val = this.convertValue(value);

        this.name = name;
        this.value = val;
    }

    getName(): string {
        return this.name;
    }

    protected abstract convertValue(value: unknown): ValueType;

    subscribe(cb: Subscriber<ValueType>): Unsubscriber {
        if (!this.store) {
            this.store = writable(this.value);
        }

        return this.store.subscribe(cb);
    }

    set(val: string): void {
        const value = this.fromString(val);

        this.setValue(value);
    }

    protected abstract fromString(val: string): ValueType;

    setValue(val: ValueType): void {
        const converted = this.convertValue(val);

        this.value = converted;

        if (this.store) {
            this.store.set(converted);
        }
    }

    getValue(): ValueType {
        return this.value;
    }

    abstract getType(): TypeName;
}

export class StringVariable extends Variable<string, 'string'> {
    protected convertValue(value: unknown) {
        if (typeof value !== 'string') {
            throw new Error('Incorrect variable value');
        }
        return value;
    }

    protected fromString(val: string) {
        return val;
    }

    getType(): 'string' {
        return 'string';
    }
}

export class IntegerVariable extends Variable<number, 'integer'> {
    protected convertValue(value: unknown) {
        if (
            typeof value !== 'number' ||
            isNaN(value) ||
            value > MAX_INT ||
            value < MIN_INT ||
            value !== Math.round(value)
        ) {
            throw new Error('Incorrect variable value');
        }

        return value;
    }

    protected fromString(val: string) {
        const res = Number(val);

        return this.convertValue(res);
    }

    getType(): 'integer' {
        return 'integer';
    }
}

export class NumberVariable extends Variable<number, 'number'> {
    protected convertValue(value: unknown) {
        if (
            typeof value !== 'number' ||
            isNaN(value) ||
            !isFinite(value)
        ) {
            throw new Error('Incorrect variable value');
        }

        return value;
    }

    protected fromString(val: string) {
        const res = Number(val);

        return this.convertValue(res);
    }

    getType(): 'number' {
        return 'number';
    }
}

export class BooleanVariable extends Variable<number, 'boolean'> {
    protected convertValue(value: unknown) {
        if (value !== 1 && value !== 0 && value !== true && value !== false) {
            throw new Error('Incorrect variable value');
        }

        return Number(value);
    }

    protected fromString(val: string) {
        if (val === '1' || val === 'true') {
            return 1;
        } else if (val === '0' || val === 'false') {
            return 0;
        }

        throw new Error('Incorrect variable value');
    }

    getType(): 'boolean' {
        return 'boolean';
    }
}

export class ColorVariable extends Variable<string, 'color'> {
    protected convertValue(value: unknown) {
        if (typeof value !== 'string' || !parseColor(value)) {
            throw new Error('Incorrect variable value');
        }

        return value;
    }

    protected fromString(val: string) {
        return this.convertValue(val);
    }

    getType(): 'color' {
        return 'color';
    }
}

export class UrlVariable extends Variable<string, 'url'> {
    protected convertValue(value: unknown) {
        if (typeof value !== 'string') {
            throw new Error('Incorrect variable value');
        }

        return value;
    }

    protected fromString(val: string) {
        return val;
    }

    getType(): 'url' {
        return 'url';
    }
}

export const TYPE_TO_CLASS = {
    string: StringVariable,
    number: NumberVariable,
    integer: IntegerVariable,
    boolean: BooleanVariable,
    color: ColorVariable,
    url: UrlVariable
};

export function createVariable(
    name: string,
    type: VariableType,
    value: unknown
):
    StringVariable | NumberVariable | IntegerVariable |
    BooleanVariable | ColorVariable | UrlVariable {
    if (!(type in TYPE_TO_CLASS)) {
        throw new Error('Unsupported variable type');
    }

    return new (TYPE_TO_CLASS[type] as any)(name, value);
}

export function defaultValueByType(type: keyof typeof TYPE_TO_CLASS): VariableValue {
    if (type === 'boolean' || type === 'number' || type === 'integer') {
        return 0;
    }

    return '';
}

export function variableToValue(variable: Variable): EvalValue {
    return {
        type: variable.getType(),
        value: variable.getValue()
    };
}
