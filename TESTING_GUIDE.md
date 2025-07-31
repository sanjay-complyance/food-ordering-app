# 🧪 Testing Guide: Unit & Integration Tests

## 1. Test Types in This Codebase

- **Unit Tests:** Test a single function, React component, or module in isolation.  
  _Example: Rendering a notification bell, testing a utility function._
- **Integration Tests:** Test how multiple modules work together, often including API routes, database mocks, and authentication.  
  _Example: Testing an API route with mocked DB and session, or a form that interacts with hooks and context._

---

## 2. Test File Structure & Naming

- All test files are in `src/test/`.
- Use `.test.ts` or `.test.tsx` for test files.
- Integration tests often use: `feature-api-integration.test.ts`.
- Unit/component tests use: `feature.test.tsx`.

---

## 3. Test Frameworks & Tools

- **Vitest:** Main test runner (Jest-compatible API).
- **React Testing Library:** For React component tests.
- **vi.mock:** For mocking modules and dependencies.
- **Testing API routes:** Import route handlers directly and call them with mocked `NextRequest`.

---

## 4. How to Write a Unit Test (React Component Example)

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { describe, it, expect, vi, beforeEach } from "vitest";

global.fetch = vi.fn() as unknown as typeof fetch;

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render notification bell with unread count", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notifications: [/* ...mock data... */] }),
    });

    render(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeTruthy();
      expect(screen.getByText("1")).toBeTruthy(); // Unread badge
    });
  });
});
```

**Tips:**
- Use `render` to mount the component.
- Use `screen.getBy...` queries to find elements.
- Use `waitFor` for async UI updates.
- Mock network requests and global objects as needed.

---

## 5. How to Write an Integration/API Route Test

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/menu/route";
import dbConnect from "@/lib/mongodb";
import Menu from "@/models/Menu";
import { auth } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/models/Menu", () => ({ default: { find: vi.fn() } }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("Menu API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return menus successfully", async () => {
    vi.mocked(dbConnect).mockResolvedValue(undefined);
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" }, expires: "2099-12-31T23:59:59.999Z" });
    vi.mocked(Menu.find).mockReturnValue({ populate: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue([/* ...mockMenus... */]) }) } as any);

    const request = new NextRequest("http://localhost:3000/api/menu");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });
});
```

**Tips:**
- Always mock DB and external dependencies.
- Use `vi.mocked()` for type-safe mocking.
- Import route handlers directly and call with a mocked `NextRequest`.
- Reset mocks in `beforeEach`/`afterEach`.

---

## 6. Mocking Strategies

- **Mocking Modules:**
  Use `vi.mock("module", () => ({ ... }))` at the top of your test file.
- **Mocking Functions:**
  Use `vi.fn()` for simple functions, or `vi.fn().mockResolvedValue(...)` for async.
- **Mocking Classes/Constructors:**
  Return a function with static methods attached, or use `Object.assign`.
- **Mocking Global Objects:**
  Assign to `global.fetch`, `global.EventSource`, etc.

**Example:**
```ts
vi.mock("@/models/Menu", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    // ...other methods
  },
}));
```

---

## 7. Best Practices

- **Arrange-Act-Assert:** Structure tests in three parts: setup, action, and assertion.
- **Keep tests isolated:** Reset all mocks and state between tests.
- **Test both success and failure cases.**
- **Use realistic mock data.**
- **Prefer `screen.getByRole`/`getByText` for accessibility.**
- **For async UI, always use `waitFor`.**
- **For API tests, check both status codes and response bodies.**

---

## 8. Troubleshooting Common Issues

- **Mocks not working:**
  - Ensure you import modules after mocking.
  - Use `vi.mocked()` for type safety.
  - Reset mocks in `beforeEach`/`afterEach`.
- **Type errors with mocks:**
  - Use `as unknown as Type` or `as Partial<Type>` for complex mocks.
  - For Mongoose models, mock only the methods you use.
- **Component not updating in test:**
  - Use `waitFor` for async state/UI changes.
  - Ensure you wrap components in required providers (e.g., `ToastProvider`).
- **API route tests failing:**
  - Check that all DB/auth dependencies are mocked.
  - Use realistic mock return values.

---

## 9. How to Add a New Test

1. **Create a new file in `src/test/`** with `.test.ts` or `.test.tsx` extension.
2. **Import the function/component/route you want to test.**
3. **Mock all external dependencies at the top of the file.**
4. **Write your test using `describe`, `it`, and `expect`.**
5. **Run tests with `npm test` and ensure they pass.**

---

## 10. Example: Fixing a Mock

**Problem:**
Type error: "Argument of type 'Partial<Model<IMenu, ...>>' is not assignable..."

**Solution:**
- Use `as unknown as ReturnType` or mock only the methods you use.
- For chained Mongoose calls, mock each method in the chain.

**Example:**
```ts
vi.mocked(Menu.find).mockReturnValue({
  populate: vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnValue(mockMenus),
  }),
} as any); // Or as Partial<typeof Menu>
```

---

## 11. Running Tests

- **Unit/Integration:**  
  `npm test` (runs all Vitest tests)
- **E2E (Playwright):**  
  `npx playwright test` (see separate E2E docs for Playwright)

---

## 12. Further Reading

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Mocking in Vitest](https://vitest.dev/guide/mocking.html)
- [Next.js API Route Testing](https://nextjs.org/docs/pages/building-your-application/testing)

---

## 13. Template for New Test File

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
// ...other imports

// Mock dependencies
vi.mock("...");

// Import after mocking
import { ... } from "...";

describe("Feature or API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should ...", async () => {
    // Arrange

    // Act

    // Assert
    expect(...).toBe(...);
  });
});
```

---

**By following this guide, your team will be able to write robust, maintainable unit and integration tests for all features in your codebase.** 