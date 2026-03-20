<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Save handler
if ( isset( $_POST['tmopt_nav_nonce'] ) && wp_verify_nonce( $_POST['tmopt_nav_nonce'], 'themator_save_nav' ) ) {
    $nav_fields = [ 'tmopt_logo_url', 'tmopt_logo_height', 'tmopt_site_name', 'tmopt_nav_position', 'tmopt_sticky_nav', 'tmopt_show_search', 'tmopt_footer_text', 'tmopt_footer_bg', 'tmopt_footer_color' ];
    foreach ( $nav_fields as $f ) {
        if ( $f === 'tmopt_sticky_nav' || $f === 'tmopt_show_search' ) {
            update_option( $f, isset( $_POST[$f] ) ? '1' : '0' );
        } else {
            update_option( $f, sanitize_text_field( wp_unslash( $_POST[$f] ?? '' ) ) );
        }
    }
    echo '<div class="tm-notice tm-notice-success">✅ Navigation sauvegardée.</div>';
}

$logo_url     = get_option( 'tmopt_logo_url', '' );
$logo_height  = get_option( 'tmopt_logo_height', '50' );
$site_name    = get_option( 'tmopt_site_name', get_bloginfo('name') );
$nav_position = get_option( 'tmopt_nav_position', 'fixed' );
$sticky_nav   = get_option( 'tmopt_sticky_nav', '0' );
$show_search  = get_option( 'tmopt_show_search', '1' );
$footer_text  = get_option( 'tmopt_footer_text', '© ' . date('Y') . ' ' . get_bloginfo('name') . '. Tous droits réservés.' );
$footer_bg    = get_option( 'tmopt_footer_bg', '#1a1a1a' );
$footer_color = get_option( 'tmopt_footer_color', '#ffffff' );
?>
<div class="themator-admin-wrap">
    <?php themator_admin_header( 'Navigation & Footer' ); ?>

    <form method="post">
        <?php wp_nonce_field( 'themator_save_nav', 'tmopt_nav_nonce' ); ?>

        <!-- Logo -->
        <div class="tm-admin-section">
            <h2>🖼️ Logo & Identité</h2>
            <div class="tm-field-row">
                <div class="tm-field-label">
                    URL du Logo<div class="tm-field-desc">Collez l'URL d'une image ou utilisez le sélecteur média.</div>
                </div>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <input type="url" name="tmopt_logo_url" value="<?php echo esc_attr($logo_url); ?>" placeholder="https://..." style="flex:1;min-width:250px;" id="tmopt-logo-url-field">
                    <button type="button" class="tm-btn" id="tmopt-logo-picker">📂 Choisir</button>
                    <?php if ($logo_url): ?>
                        <img src="<?php echo esc_url($logo_url); ?>" style="height:<?php echo esc_attr($logo_height); ?>px;max-width:150px;object-fit:contain;border:1px solid #eee;border-radius:4px;padding:4px;" id="tmopt-logo-preview">
                    <?php endif; ?>
                </div>
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Hauteur logo (px)<div class="tm-field-desc">Hauteur d'affichage du logo dans le header.</div></div>
                <input type="number" name="tmopt_logo_height" value="<?php echo esc_attr($logo_height); ?>" min="20" max="150" style="width:100px;">
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Nom du site<div class="tm-field-desc">Affiché si aucun logo n'est défini.</div></div>
                <input type="text" name="tmopt_site_name" value="<?php echo esc_attr($site_name); ?>" style="width:300px;">
            </div>
        </div>

        <!-- Header -->
        <div class="tm-admin-section">
            <h2>📌 Header</h2>
            <div class="tm-field-row">
                <div class="tm-field-label">Position du header</div>
                <select name="tmopt_nav_position">
                    <option value="static" <?php selected($nav_position,'static'); ?>>Statique</option>
                    <option value="fixed"  <?php selected($nav_position,'fixed');  ?>>Fixe (fixed)</option>
                    <option value="sticky" <?php selected($nav_position,'sticky'); ?>>Sticky</option>
                </select>
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Navigation sticky au scroll</div>
                <label style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" name="tmopt_sticky_nav" value="1" <?php checked($sticky_nav,'1'); ?>>
                    Activer le sticky header
                </label>
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Afficher la barre de recherche</div>
                <label style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" name="tmopt_show_search" value="1" <?php checked($show_search,'1'); ?>>
                    Oui
                </label>
            </div>
        </div>

        <!-- Footer -->
        <div class="tm-admin-section">
            <h2>🦶 Footer</h2>
            <div class="tm-field-row">
                <div class="tm-field-label">Texte du footer<div class="tm-field-desc">Affiché en bas du site.</div></div>
                <input type="text" name="tmopt_footer_text" value="<?php echo esc_attr($footer_text); ?>" style="width:100%;max-width:600px;">
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Couleur de fond footer</div>
                <input type="color" name="tmopt_footer_bg" value="<?php echo esc_attr($footer_bg); ?>">
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Couleur texte footer</div>
                <input type="color" name="tmopt_footer_color" value="<?php echo esc_attr($footer_color); ?>">
            </div>
        </div>

        <div class="tm-btn-row">
            <button type="submit" class="tm-btn tm-btn-primary">💾 Sauvegarder la navigation</button>
        </div>
    </form>

    <script>
    (function(){
        var pickerBtn = document.getElementById('tmopt-logo-picker');
        var urlField  = document.getElementById('tmopt-logo-url-field');
        var preview   = document.getElementById('tmopt-logo-preview');
        if (!pickerBtn) return;
        pickerBtn.addEventListener('click', function(){
            var frame = wp.media({ title: 'Logo', multiple: false, library: { type: 'image' } });
            frame.on('select', function(){
                var att = frame.state().get('selection').first().toJSON();
                urlField.value = att.url;
                if (!preview) { preview = document.createElement('img'); preview.id='tmopt-logo-preview'; preview.style.cssText='height:50px;max-width:150px;object-fit:contain;border:1px solid #eee;border-radius:4px;padding:4px;'; urlField.parentNode.appendChild(preview); }
                preview.src = att.url;
            });
            frame.open();
        });
    })();
    </script>
</div>
