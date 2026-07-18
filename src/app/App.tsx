import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from '@/features/home/HomePage';
import { StyleguidePage } from '@/features/styleguide/StyleguidePage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="styleguide" element={<StyleguidePage />} />
        <Route
          path="*"
          element={
            <div className="p-8">
              <h1 className="text-xl font-semibold">Page not found</h1>
              <p className="mt-2 text-ink-soft">This route does not exist in the simulation.</p>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
