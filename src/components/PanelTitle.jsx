// Judul kotak di halaman detail: ikon dalam tile kecil + teks (gaya ada di WildlifeDetailPage.css).
function PanelTitle({ icon: Icon, children, id }) {
  return (
    <h2 className="panel__title" id={id}>
      <span className="panel__icon" aria-hidden="true">
        <Icon />
      </span>
      {children}
    </h2>
  )
}

export default PanelTitle
