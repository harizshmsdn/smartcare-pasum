import Image, { type ImageProps } from "next/image";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";

type Props = Omit<ImageProps, "src"> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;

  return (
    <>
      <Image {...rest} src={srcLight} className="imgLight" />
      <Image {...rest} src={srcDark} className="imgDark" />
    </>
  );
};

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6">
        <h1 className="text-2xl font-bold mb-8">SMART-CARE</h1>
        <nav className="flex flex-col gap-4">
          <a href="#" className="text-blue-400 font-medium">Dashboard</a>
          <a href="#" className="hover:text-blue-400 transition-colors">Student Profiles</a>
          <a href="#" className="hover:text-blue-400 transition-colors">Early Alerts</a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-800">Class Overview</h2>
          <div className="flex gap-4">
            <span className="text-sm bg-blue-100 text-blue-800 py-1 px-3 rounded-full font-medium">
              Lecturer View
            </span>
          </div>
        </header>

        {/* Data Consolidation Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">124</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-medium">Avg. Attendance</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">92%</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200">
            <h3 className="text-red-500 text-sm font-medium">High-Risk Alerts</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">3</p>
          </div>
        </div>
      </main>
    </div>
  );
}