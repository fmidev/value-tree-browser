import * as TextCutter from "./TextCutter";

it('text shorter than maxchars is returned as-is', () => {
    expect(TextCutter.cut('foo', 5)).toBe('foo');
});

it('text exactly as long as maxchars is returned as-is', () => {
    expect(TextCutter.cut('foo', 3)).toBe('foo');
});

it('two word text is cut after first word', () => {
    expect(TextCutter.cut('hello world', 10)).toBe('hello...');
});

it('two word text fits just about', () => {
    expect(TextCutter.cut('hello world', 11)).toBe('hello world');
});

it('three word text does not fit, ellipsis in the middle', () => {
    expect(TextCutter.cut('hello world woot', 11)).toBe('hello...woot');
});


it('four word text does not fit, ellipsis in the middle', () => {
    expect(TextCutter.cut('hello this world woot', 15)).toBe('hello this...woot');
});

it('five word text does not fit, ellipsis in the middle', () => {
    expect(TextCutter.cut('hello this world is woot', 18)).toBe('hello this...is woot');
});

it('text has no breaks but is too long, return as-is', () => {
    expect(TextCutter.cut('foobar', 3)).toBe('foobar');
});
