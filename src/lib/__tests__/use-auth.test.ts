import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: any[]) => mockSignInAction(...args),
  signUp: (...args: any[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: any[]) => mockCreateProject(...args),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  });

  describe("signIn", () => {
    test("returns result from signInAction", async () => {
      mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signIn("user@example.com", "wrong");
      });

      expect(response).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("calls signInAction with email and password", async () => {
      mockSignInAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockSignInAction).toHaveBeenCalledWith("user@example.com", "password123");
    });

    test("isLoading is true during call, false after", async () => {
      let resolveSignIn: (v: any) => void;
      mockSignInAction.mockReturnValue(new Promise(res => { resolveSignIn = res; }));

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      // setIsLoading(true) runs synchronously before the first await in signIn
      act(() => { result.current.signIn("user@example.com", "password123"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignIn!({ success: false }); });
      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false if signInAction throws", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not navigate when sign in fails", async () => {
      mockSignInAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    test("returns result from signUpAction", async () => {
      mockSignUpAction.mockResolvedValue({ success: false, error: "Email already taken" });

      const { result } = renderHook(() => useAuth());

      let response: any;
      await act(async () => {
        response = await result.current.signUp("user@example.com", "password123");
      });

      expect(response).toEqual({ success: false, error: "Email already taken" });
    });

    test("calls signUpAction with email and password", async () => {
      mockSignUpAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "securepass");
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("newuser@example.com", "securepass");
    });

    test("does not navigate when sign up fails", async () => {
      mockSignUpAction.mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@example.com", "password123");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("post sign-in navigation", () => {
    test("saves anon work as project and redirects when anon work has messages", async () => {
      const anonMessages = [{ id: "1", role: "user", content: "Hello" }];
      const anonFileSystemData = { "/file.js": { type: "file" } };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: anonMessages, fileSystemData: anonFileSystemData });
      mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonMessages,
        data: anonFileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("skips anon work when messages array is empty", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("redirects to most recent project when no anon work", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "project-1" }, { id: "project-2" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    test("creates new project and redirects when user has no existing projects", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockCreateProject.mockResolvedValue({ id: "fresh-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/fresh-project-id");
    });

    test("same post-sign-in navigation applies to signUp", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "project-abc" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/project-abc");
    });
  });
});
