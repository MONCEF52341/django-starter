// Modifie le fichier urls.py
export async function updateUrls(projectName: string): Promise<void> {
  const URLS_FILE = `${projectName}/urls.py`;
  console.log(`🔗 Mise à jour de ${URLS_FILE}...`);

  const urlsContent = `from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
]

if settings.DEBUG:
    import debug_toolbar
    from django.conf.urls.static import static

    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
    urlpatterns += [path("silk/", include("silk.urls", namespace="silk"))]
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
`;

  await Deno.writeTextFile(URLS_FILE, urlsContent);
}
