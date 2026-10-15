import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminBackupPage from "./AdminBackupPage";

const mocks = vi.hoisted(() => ({
  admin: true,
  tenant: { id: "tenant-one", name: "Empresa A" },
  exportBackup: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-one" }, hasRole: () => mocks.admin }),
}));
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ activeTenant: mocks.tenant }) }));
vi.mock("@/lib/admin-backup", () => ({ exportAdminBackup: mocks.exportBackup }));

describe("AdminBackupPage", () => {
  beforeEach(() => {
    mocks.admin = true;
    mocks.tenant = { id: "tenant-one", name: "Empresa A" };
    mocks.exportBackup.mockReset();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test-backup"),
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not offer export to a non-admin", () => {
    mocks.admin = false;
    render(<AdminBackupPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("apenas para administradores");
    expect(screen.queryByRole("button", { name: "Preparar backup" })).toBeNull();
    expect(mocks.exportBackup).not.toHaveBeenCalled();
  });

  it("aborts on company change and discards an in-flight result", async () => {
    let resolve: (value: unknown) => void;
    mocks.exportBackup.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const { rerender } = render(<AdminBackupPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Preparar backup" }));
    await waitFor(() => expect(mocks.exportBackup).toHaveBeenCalledOnce());
    const signal = mocks.exportBackup.mock.calls[0][0].signal;
    mocks.tenant = { id: "tenant-two", name: "Empresa B" };
    rerender(<AdminBackupPage />);
    expect(signal.aborted).toBe(true);
    resolve!({ blob: new Blob(["private"]), filename: "backup.zip", manifest: {
      status: "completed", rowCount: 1, tableCount: 1, issues: [],
    } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Preparar backup" })).toBeDisabled());
    expect(screen.queryByRole("link", { name: "Baixar arquivo ZIP" })).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("labels partial results and revokes the download when leaving", async () => {
    mocks.exportBackup.mockResolvedValue({ blob: new Blob(["data"]), filename: "partial.zip", manifest: {
      status: "partial", rowCount: 12, tableCount: 2, issues: ["Anexo indisponível"],
    } });
    const { unmount } = render(<AdminBackupPage />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Preparar backup" }));
    const link = await screen.findByRole("link", { name: "Baixar arquivo ZIP" });
    expect(link).toHaveAttribute("download", "partial.zip");
    expect(screen.getByText("Cópia parcial — confira as pendências")).toBeInTheDocument();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-backup");
  });
});
