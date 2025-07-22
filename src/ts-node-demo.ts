// This is a simple TypeScript file to demonstrate ts-node usage
console.log('Hello from ts-node!');

// Example of TypeScript features
interface User {
  id: number;
  name: string;
  email: string;
}

// Create a user object
const user: User = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com'
};

console.log('User:', user);

// Example of using async/await
async function fetchData(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Data fetched successfully!');
    }, 1000);
  });
}

// Call the async function
fetchData().then((data) => {
  console.log(data);
});