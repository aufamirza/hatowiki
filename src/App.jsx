import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Layout from './components/layout/Layout'
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

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
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
