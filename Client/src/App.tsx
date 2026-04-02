import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import CreateBotPage from "./pages/CreateBotPage/CreateBotPage";
import AuthPage from "./pages/AuthPage";
import AuthGuard from "./components/AuthGuard";
import UserLayout from "./pages/UserLayout";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import EditBotPage from "./pages/DashboardPage/Sections/EditBotPage";
import FlowBuilderPage from "./pages/FlowBuilderPage/FlowBuilderPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/create-bot" element={<AuthGuard><CreateBotPage /></AuthGuard>} />

      {/* User dashboard routes */}
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <UserLayout />
          </AuthGuard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="edit-bot" element={<EditBotPage />} />
        <Route path="flow-builder" element={<FlowBuilderPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;
