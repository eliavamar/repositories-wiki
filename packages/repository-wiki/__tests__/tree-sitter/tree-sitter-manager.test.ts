import { describe, it, expect, beforeAll } from "vitest";
import { TreeSitterManager } from "../../src/tree-sitter/tree-sitter-manager.js";



let manager: TreeSitterManager;

beforeAll(() => {
  manager = new TreeSitterManager();
});


async function extract(filePath: string, content: string) {
  return manager.extractFileSignatures(filePath, content);
}


describe("Edge cases", () => {
  it("returns type 'original' for empty content", async () => {
    const result = await extract("file.ts", "");
    expect(result.type).toBe("original");
  });

  it("returns type 'original' for whitespace-only content", async () => {
    const result = await extract("file.ts", "   \n\n  ");
    expect(result.type).toBe("original");
  });

  it("returns type 'raw' for .json files", async () => {
    const json = '{ "name": "test" }';
    const result = await extract("config.json", json);
    expect(result.type).toBe("raw");
    expect(result.content).toBe(json);
  });

  it("returns type 'raw' for .yaml files", async () => {
    const yaml = "name: test\nversion: 1";
    const result = await extract("config.yaml", yaml);
    expect(result.type).toBe("raw");
    expect(result.content).toBe(yaml);
  });

  it("returns type 'original' for unsupported extensions", async () => {
    const rust = 'fn main() { println!("hello"); }';
    const result = await extract("main.rs", rust);
    expect(result.type).toBe("original");
    expect(result.content).toBe(rust);
  });
});


describe("TypeScript (.ts)", () => {
  it("extracts import statements as compact", async () => {
    const code = `import { Foo } from "./foo";`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(`import { Foo } from "./foo";`);
  });

  it("extracts export statements (re-exports) as compact", async () => {
    const code = `export { Foo } from "./foo";`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(`export { Foo } from "./foo";`);
  });

  it("collapses function declaration body", async () => {
    const code = `function greet(name: string): string {
  return "Hello, " + name;
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("function greet(name: string): string { ... }");
  });

  it("collapses exported function declaration body", async () => {
    const code = `export function add(a: number, b: number): number {
  return a + b;
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      "export function add(a: number, b: number): number { ... }"
    );
  });

  it("formats class declaration as class_like with collapsed methods", async () => {
    const code = `class Calculator {
  private value: number;
  add(n: number): void {
    this.value += n;
  }
  reset(): void {
    this.value = 0;
  }
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "class Calculator {",
        "  private value: number",
        "  add(n: number): void { ... }",
        "  reset(): void { ... }",
        "}",
      ].join("\n")
    );
  });

  it("formats exported class declaration", async () => {
    const code = `export class Greeter {
  greet(): string {
    return "hi";
  }
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "export class Greeter {",
        "  greet(): string { ... }",
        "}",
      ].join("\n")
    );
  });

  it("formats interface declaration as class_like", async () => {
    const code = `interface User {
  name: string;
  age: number;
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    // tree-sitter interface_body/object_type children don't include trailing semicolons
    expect(result.content).toBe(
      [
        "interface User {",
        "  name: string",
        "  age: number",
        "}",
      ].join("\n")
    );
  });

  it("formats exported interface declaration", async () => {
    const code = `export interface Logger {
  log(msg: string): void;
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "export interface Logger {",
        "  log(msg: string): void",
        "}",
      ].join("\n")
    );
  });

  it("formats enum with members", async () => {
    const code = `enum Color {
  Red,
  Green,
  Blue,
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "enum Color {",
        "  Red,",
        "  Green,",
        "  Blue,",
        "}",
      ].join("\n")
    );
  });

  it("formats exported enum", async () => {
    const code = `export enum Direction {
  Up,
  Down,
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "export enum Direction {",
        "  Up,",
        "  Down,",
        "}",
      ].join("\n")
    );
  });

  it("extracts type alias as compact", async () => {
    const code = `type ID = string | number;`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("type ID = string | number;");
  });

  it("extracts exported type alias as compact", async () => {
    const code = `export type Point = { x: number; y: number };`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      "export type Point = { x: number; y: number };"
    );
  });

  it("extracts a full file with multiple declarations", async () => {
    const code = `import { Logger } from "./logger";

export type Config = { debug: boolean };

export function init(cfg: Config): void {
  console.log(cfg);
}

export class App {
  run(): void {
    init({ debug: true });
  }
}`;
    const result = await extract("file.ts", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        `import { Logger } from "./logger";`,
        "",
        "export type Config = { debug: boolean };",
        "",
        "export function init(cfg: Config): void { ... }",
        "",
        "export class App {",
        "  run(): void { ... }",
        "}",
      ].join("\n")
    );
  });
});


describe("TSX (.tsx)", () => {
  it("collapses a function component", async () => {
    const code = `export function Button(props: { label: string }) {
  return <button>{props.label}</button>;
}`;
    const result = await extract("component.tsx", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      "export function Button(props: { label: string }) { ... }"
    );
  });

  it("formats interface for props", async () => {
    const code = `interface ButtonProps {
  label: string;
  onClick: () => void;
}`;
    const result = await extract("types.tsx", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "interface ButtonProps {",
        "  label: string",
        "  onClick: () => void",
        "}",
      ].join("\n")
    );
  });
});


describe("JavaScript (.js)", () => {
  it("collapses a function declaration", async () => {
    const code = `function sum(a, b) {
  return a + b;
}`;
    const result = await extract("utils.js", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("function sum(a, b) { ... }");
  });

  it("formats a class with methods", async () => {
    const code = `class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    console.log(this.name);
  }
}`;
    const result = await extract("animal.js", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "class Animal {",
        "  constructor(name) { ... }",
        "  speak() { ... }",
        "}",
      ].join("\n")
    );
  });

  it("extracts import statement", async () => {
    const code = `import express from "express";`;
    const result = await extract("app.js", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(`import express from "express";`);
  });

  it("collapses exported function declaration", async () => {
    const code = `export function hello() {
  console.log("hello");
}`;
    const result = await extract("lib.js", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("export function hello() { ... }");
  });

  it("extracts export re-export as compact", async () => {
    const code = `export { foo } from "./foo";`;
    const result = await extract("index.js", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(`export { foo } from "./foo";`);
  });
});


describe("Python (.py)", () => {
  it("extracts import statement as compact", async () => {
    const code = `import os`;
    const result = await extract("main.py", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("import os");
  });

  it("extracts from-import statement as compact", async () => {
    const code = `from pathlib import Path`;
    const result = await extract("main.py", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("from pathlib import Path");
  });

  it("collapses function definition body", async () => {
    const code = `def greet(name: str) -> str:
    return f"Hello, {name}"`;
    const result = await extract("utils.py", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("def greet(name: str) -> str: { ... }");
  });

  it("formats class definition as class_like", async () => {
    const code = `class Dog:
    def __init__(self, name: str):
        self.name = name
    def bark(self) -> str:
        return "Woof!"`;
    const result = await extract("models.py", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "class Dog: {",
        "  def __init__(self, name: str): { ... }",
        "  def bark(self) -> str: { ... }",
        "}",
      ].join("\n")
    );
  });

  it("formats decorated function definition", async () => {
    const code = `@app.route("/")
def index():
    return "Hello"`;
    const result = await extract("routes.py", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        `@app.route("/")`,
        "def index(): { ... }",
      ].join("\n")
    );
  });

  it("formats decorated class definition", async () => {

    const code = `@dataclass
class Point:
    x: float
    y: float`;
    const result = await extract("models.py", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "@dataclass",
        "class Point: { ... }",
      ].join("\n")
    );
  });

  it("extracts multiple imports and a function", async () => {
    const code = `import os
from sys import argv

def main():
    print(argv)`;
    const result = await extract("main.py", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "import os",
        "",
        "from sys import argv",
        "",
        "def main(): { ... }",
      ].join("\n")
    );
  });
});


describe("Java (.java)", () => {
  it("extracts package declaration as compact", async () => {
    const code = `package com.example.app;`;
    const result = await extract("App.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("package com.example.app;");
  });

  it("extracts import declaration as compact", async () => {
    const code = `import java.util.List;`;
    const result = await extract("App.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("import java.util.List;");
  });

  it("formats class with methods as class_like", async () => {
    const code = `class Calculator {
    int add(int a, int b) {
        return a + b;
    }
    int subtract(int a, int b) {
        return a - b;
    }
}`;
    const result = await extract("Calculator.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "class Calculator {",
        "  int add(int a, int b) { ... }",
        "  int subtract(int a, int b) { ... }",
        "}",
      ].join("\n")
    );
  });

  it("formats interface as class_like", async () => {
    const code = `interface Printable {
    void print();
    String format();
}`;
    const result = await extract("Printable.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "interface Printable {",
        "  void print();",
        "  String format();",
        "}",
      ].join("\n")
    );
  });

  it("formats enum with members", async () => {
    const code = `enum Season {
    SPRING,
    SUMMER,
    AUTUMN,
    WINTER
}`;
    const result = await extract("Season.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "enum Season {",
        "    SPRING,",
        "    SUMMER,",
        "    AUTUMN,",
        "    WINTER",
        "}",
      ].join("\n")
    );
  });

  it("collapses method declaration body", async () => {
    const code = `class App {
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}`;
    const result = await extract("App.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "class App {",
        "  public static void main(String[] args) { ... }",
        "}",
      ].join("\n")
    );
  });

  it("collapses constructor declaration body", async () => {
    const code = `class Person {
    String name;
    Person(String name) {
        this.name = name;
    }
}`;
    const result = await extract("Person.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "class Person {",
        "  String name;",
        "  Person(String name) { ... }",
        "}",
      ].join("\n")
    );
  });

  it("extracts annotation type declaration as compact", async () => {
    const code = `@interface MyAnnotation {
    String value();
}`;
    const result = await extract("MyAnnotation.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "@interface MyAnnotation {",
        "    String value();",
        "}",
      ].join("\n")
    );
  });

  it("extracts a full Java file", async () => {
    const code = `package com.example;

import java.util.List;

public class UserService {
    private List<String> users;
    public UserService() {
        this.users = new java.util.ArrayList<>();
    }
    public void addUser(String name) {
        users.add(name);
    }
}`;
    const result = await extract("UserService.java", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "package com.example;",
        "",
        "import java.util.List;",
        "",
        "public class UserService {",
        "  private List<String> users;",
        "  public UserService() { ... }",
        "  public void addUser(String name) { ... }",
        "}",
      ].join("\n")
    );
  });
});

// ─── Go ──────────────────────────────────────────────────────────────────────

describe("Go (.go)", () => {
  it("extracts package clause as compact", async () => {
    const code = `package main`;
    const result = await extract("main.go", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("package main");
  });

  it("extracts import declaration as compact", async () => {
    const code = `import "fmt"`;
    const result = await extract("main.go", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(`import "fmt"`);
  });

  it("extracts grouped import as compact", async () => {
    const code = `import (
	"fmt"
	"os"
)`;
    const result = await extract("main.go", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        `import (`,
        `\t"fmt"`,
        `\t"os"`,
        `)`,
      ].join("\n")
    );
  });

  it("collapses function declaration body", async () => {
    const code = `func add(a int, b int) int {
	return a + b
}`;
    const result = await extract("math.go", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("func add(a int, b int) int { ... }");
  });

  it("collapses method declaration body", async () => {
    const code = `func (c *Calculator) Add(n int) {
	c.value += n
}`;
    const result = await extract("calc.go", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe("func (c *Calculator) Add(n int) { ... }");
  });

  it("formats struct type declaration as class_like", async () => {
    const code = `type User struct {
	Name string
	Age  int
}`;
    const result = await extract("models.go", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "type User struct {",
        "  Name string",
        "  Age  int",
        "}",
      ].join("\n")
    );
  });

  it("formats interface type declaration as class_like", async () => {
    const code = `type Reader interface {
	Read(p []byte) (n int, err error)
}`;
    const result = await extract("io.go", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "type Reader {",
        "  Read(p []byte) (n int, err error)",
        "}",
      ].join("\n")
    );
  });

  it("extracts a full Go file", async () => {
    const code = `package main

import "fmt"

func main() {
	fmt.Println("Hello")
}

type Greeter struct {
	Name string
}

func (g *Greeter) Greet() string {
	return "Hello, " + g.Name
}`;
    const result = await extract("main.go", code);
    expect(result.type).toBe("signature");
    expect(result.content).toBe(
      [
        "package main",
        "",
        `import "fmt"`,
        "",
        "func main() { ... }",
        "",
        "type Greeter struct {",
        "  Name string",
        "}",
        "",
        `func (g *Greeter) Greet() string { ... }`,
      ].join("\n")
    );
  });
});
