class TempFile implements Disposable {
  private name: string;

  constructor(name: string) {
    this.name = name;
    console.log(`Creating file ${this.name}`);
  }

  [Symbol.dispose]() {
    console.log(`Closing file ${this.name}`);
  }
}

function main() {
  using file = new TempFile("temp.txt");
  console.log("Working with file...");
}

main();
// Output:
// Creating file temp.txt
// Working with file...
// Closing file temp.txt

console.log('end')
