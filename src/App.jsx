import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Layout from './components/layout/Layout'
import { LOCALES } from './i18n/locales'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import WildlifePage from './pages/wildlife/WildlifePage'
import WildlifeListPage from './pages/wildlife/WildlifeListPage'
import WildlifeDetailPage from './pages/wildlife/WildlifeDetailPage'
import RecipeListPage from './pages/recipes/RecipeListPage'
import RecipeDetailPage from './pages/recipes/RecipeDetailPage'
import GoodsListPage from './pages/goods/GoodsListPage'
import CropDetailPage from './pages/goods/CropDetailPage'
import CollectibleDetailPage from './pages/goods/CollectibleDetailPage'
import IngredientDetailPage from './pages/goods/IngredientDetailPage'
import HobbyItemDetailPage from './pages/goods/HobbyItemDetailPage'
import NpcDetailPage from './pages/npcs/NpcDetailPage'
import AchievementDetailPage from './pages/achievements/AchievementDetailPage'

// Semua halaman, dipakai sekali per bahasa: tanpa awalan (Indonesia), di bawah /th (Thai), dan di bawah /en (Inggris).
// Slug sama untuk semua bahasa. Daftar halaman untuk HTML statis & sitemap ada di src/seo/pageMeta.js.
const pageRoutes = () => [
  { index: true, element: <HomePage /> },
  {
    path: 'wildlife',
    children: [
      { index: true, element: <WildlifePage /> },
      // key per kategori: pindah dari Fish ke Bugs memasang halaman baru, bukan membawa status halaman lama.
      { path: 'fish', element: <WildlifeListPage key="fish" kindSlug="fish" /> },
      { path: 'fish/:slug', element: <WildlifeDetailPage key="fish" kindSlug="fish" /> },
      { path: 'bugs', element: <WildlifeListPage key="bugs" kindSlug="bugs" /> },
      { path: 'bugs/:slug', element: <WildlifeDetailPage key="bugs" kindSlug="bugs" /> },
      { path: 'birds', element: <WildlifeListPage key="birds" kindSlug="birds" /> },
      { path: 'birds/:slug', element: <WildlifeDetailPage key="birds" kindSlug="birds" /> },
      { path: 'animals', element: <WildlifeListPage key="animals" kindSlug="animals" /> },
      { path: 'animals/:slug', element: <WildlifeDetailPage key="animals" kindSlug="animals" /> },
    ],
  },
  {
    path: 'recipes',
    children: [
      { index: true, element: <RecipeListPage /> },
      { path: ':slug', element: <RecipeDetailPage /> },
    ],
  },
  {
    path: 'crops',
    children: [
      { index: true, element: <GoodsListPage key="crops" kindSlug="crops" /> },
      { path: ':slug', element: <CropDetailPage /> },
    ],
  },
  {
    path: 'collectibles',
    children: [
      { index: true, element: <GoodsListPage key="collectibles" kindSlug="collectibles" /> },
      { path: ':slug', element: <CollectibleDetailPage /> },
    ],
  },
  {
    path: 'ingredients',
    children: [
      { index: true, element: <GoodsListPage key="ingredients" kindSlug="ingredients" /> },
      { path: ':slug', element: <IngredientDetailPage /> },
    ],
  },
  {
    path: 'items',
    children: [
      { index: true, element: <GoodsListPage key="items" kindSlug="items" /> },
      { path: ':slug', element: <HobbyItemDetailPage /> },
    ],
  },
  {
    path: 'npcs',
    children: [
      { index: true, element: <GoodsListPage key="npcs" kindSlug="npcs" /> },
      { path: ':slug', element: <NpcDetailPage /> },
    ],
  },
  {
    path: 'achievements',
    children: [
      { index: true, element: <GoodsListPage key="achievements" kindSlug="achievements" /> },
      { path: ':slug', element: <AchievementDetailPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]

// Tidak ada awalan /id: /id/... diarahkan ke alamat tanpa awalan (vercel.json melakukannya di server; ini cadangan
// untuk development dan navigasi di dalam aplikasi).
function RedirectFromId() {
  const { pathname, search, hash } = useLocation()
  return <Navigate replace to={`${pathname.replace(/^\/id(?=\/|$)/, '') || '/'}${search}${hash}`} />
}

// Layout tanpa path membungkus semua bahasa, jadi toolbar & footer tidak dipasang ulang saat bahasa diganti.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: LOCALES.map((locale) => ({ path: locale.prefix || '/', children: pageRoutes() })),
  },
  { path: '/id/*', element: <RedirectFromId /> },
])

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Analytics />
    </>
  )
}

export default App
