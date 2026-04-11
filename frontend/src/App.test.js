import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders overview link on initial load", () => {
  render(<App />);
  expect(screen.getByText(/overview/i)).toBeInTheDocument();
});
