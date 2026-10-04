-- ============================================================
-- Product logos
--
-- The image files live in public/products/ and are served by the app
-- itself, so these are site-relative paths rather than links to someone
-- else's server. Hotlinking a brand's own CDN breaks the moment they
-- change a filename, and it quietly sends your visitors' requests to them.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

update public.sub_products
   set thumbnail_url = v.url
  from (values
    ('canva-pro',            '/products/canva-pro.png'),
    ('capcut-pro',           '/products/capcut-pro.png'),
    ('adobe-creative-cloud', '/products/adobe-creative-cloud.png'),
    ('quillbot-premium',     '/products/quillbot-premium.png'),
    ('microsoft-365',        '/products/microsoft-365.png'),
    ('chatgpt-plus',         '/products/chatgpt-plus.png')
  ) as v(slug, url)
 where public.sub_products.slug = v.slug
   -- Only fill it in when it is still empty, so a logo you later upload
   -- through the admin panel is never overwritten by a re-run.
   and (public.sub_products.thumbnail_url is null
        or public.sub_products.thumbnail_url = '');

-- ------------------------------------------------------------
-- Repair: an earlier version of this file pointed at .webp/.jpg
-- thumbnails. Those source files were later converted to 16:9 .png
-- banners and the originals removed, so any row still holding an old
-- path is now a 404. Rewrite just those, and nothing else.
-- ------------------------------------------------------------
update public.sub_products
   set thumbnail_url = replace(replace(thumbnail_url, '.webp', '.png'), '.jpg', '.png')
 where thumbnail_url like '/products/%'
   and (thumbnail_url like '%.webp' or thumbnail_url like '%.jpg');

notify pgrst, 'reload schema';

commit;
