import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../ErrorBoundary";

// Suppress console.error for cleaner test output
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ErrorBoundary", () => {
  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="test-child">Test Content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("test-child")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should catch errors and display fallback UI", () => {
    // Component that throws an error
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/DesktopPet encountered an unexpected error/i),
    ).toBeInTheDocument();
  });

  it("should display error details in development mode", () => {
    // const originalEnv = process.env.NODE_ENV;
    // process.env.NODE_ENV = "development";

    const ThrowError = () => {
      throw new Error("Test error message");
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    // Error details should be in a collapsed details element
    expect(screen.getByText("Error Details (Dev Only)")).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();

    // process.env.NODE_ENV = originalEnv;
  });

  it("should call onError callback when error is caught", () => {
    const onErrorMock = vi.fn();

    const ThrowError = () => {
      throw new Error("Callback test error");
    };

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(onErrorMock).toHaveBeenCalled();
    const [error] = onErrorMock.mock.calls[0];
    expect(error.message).toBe("Callback test error");
  });

  it("should recover from error when Try Again button is clicked", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    const ConditionalError = () => {
      if (shouldThrow) {
        throw new Error("Conditional error");
      }
      return <div data-testid="recovered-content">Recovered!</div>;
    };

    render(
      <ErrorBoundary>
        <ConditionalError />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Simulate recovery by disabling error
    shouldThrow = false;

    // Click "Try Again" button - this resets the error boundary state
    const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });
    await user.click(tryAgainButton);

    // After reset, the children should attempt to render again
    // Since shouldThrow is now false, it should render successfully
    await waitFor(() => {
      expect(screen.getByTestId("recovered-content")).toBeInTheDocument();
    });
  });

  it("should display reload button", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole("button", { name: /Reload App/i }),
    ).toBeInTheDocument();
  });
});
