<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Save handler
if ( isset( $_POST['themator_options_nonce'] ) && wp_verify_nonce( $_POST['themator_options_nonce'], 'themator_save_options' ) ) {
    $fields = array( 'tmopt_primary_color', 'tmopt_secondary_color', 'tmopt_font', 'tmopt_custom_css', 'tmopt_post_types' );
    foreach ( $fields as $field ) {
        if ( $field === 'tmopt_custom_css' ) {
            update_option( $field, wp_strip_all_tags( wp_unslash( $_POST[ $field ] ?? '' ) ) );
        } elseif ( $field === 'tmopt_post_types' ) {
            update_option( $field, array_map( 'sanitize_text_field', (array)( $_POST[ $field ] ?? array() ) ) );
        } else {
            update_option( $field, sanitize_text_field( wp_unslash( $_POST[ $field ] ?? '' ) ) );
        }
    }
    echo '<div class="tm-notice tm-notice-success">✅ ' . esc_html__( 'Options sauvegardées avec succès.', 'themator' ) . '</div>';
}

$primary_color   = get_option( 'tmopt_primary_color', '#8f43ee' );
$secondary_color = get_option( 'tmopt_secondary_color', '#00e263' );
$font            = get_option( 'tmopt_font', 'Open Sans' );
$custom_css      = get_option( 'tmopt_custom_css', '' );
$post_types_opt  = (array) get_option( 'tmopt_post_types', array( 'page' ) );

$google_fonts = array( 'Open Sans', 'Inter', 'Roboto', 'Outfit', 'Poppins', 'Lato', 'Raleway', 'Montserrat' );
$all_post_types = get_post_types( array( 'public' => true ), 'objects' );
?>
<div class="themator-admin-wrap">
    <?php themator_admin_header( __( 'Options Générales', 'themator' ) ); ?>

    <form method="post">
        <?php wp_nonce_field( 'themator_save_options', 'themator_options_nonce' ); ?>

        <!-- Couleurs -->
        <div class="tm-admin-section">
            <h2>🎨 <?php esc_html_e( 'Couleurs', 'themator' ); ?></h2>

            <div class="tm-field-row">
                <div class="tm-field-label">
                    <?php esc_html_e( 'Couleur principale', 'themator' ); ?>
                    <div class="tm-field-desc"><?php esc_html_e( 'Utilisée pour les boutons, accents, liens.', 'themator' ); ?></div>
                </div>
                <div>
                    <input type="color" name="tmopt_primary_color" value="<?php echo esc_attr( $primary_color ); ?>">
                    <span style="margin-left:8px;font-size:13px;color:#999;"><?php echo esc_html( $primary_color ); ?></span>
                </div>
            </div>

            <div class="tm-field-row">
                <div class="tm-field-label">
                    <?php esc_html_e( 'Couleur secondaire', 'themator' ); ?>
                    <div class="tm-field-desc"><?php esc_html_e( 'Utilisée pour les boutons de confirmation.', 'themator' ); ?></div>
                </div>
                <div>
                    <input type="color" name="tmopt_secondary_color" value="<?php echo esc_attr( $secondary_color ); ?>">
                    <span style="margin-left:8px;font-size:13px;color:#999;"><?php echo esc_html( $secondary_color ); ?></span>
                </div>
            </div>
        </div>

        <!-- Typographie -->
        <div class="tm-admin-section">
            <h2>🔤 <?php esc_html_e( 'Typographie', 'themator' ); ?></h2>

            <div class="tm-field-row">
                <div class="tm-field-label">
                    <?php esc_html_e( 'Police globale', 'themator' ); ?>
                    <div class="tm-field-desc"><?php esc_html_e( 'Police appliquée au contenu Themator.', 'themator' ); ?></div>
                </div>
                <select name="tmopt_font">
                    <?php foreach ( $google_fonts as $gf ) : ?>
                        <option value="<?php echo esc_attr( $gf ); ?>" <?php selected( $font, $gf ); ?>>
                            <?php echo esc_html( $gf ); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
        </div>

        <!-- Post Types -->
        <div class="tm-admin-section">
            <h2>📋 <?php esc_html_e( 'Types de contenu', 'themator' ); ?></h2>
            <div class="tm-field-row">
                <div class="tm-field-label">
                    <?php esc_html_e( 'Activer le builder sur', 'themator' ); ?>
                    <div class="tm-field-desc"><?php esc_html_e( 'Cochez les types de contenu où Themator apparaîtra.', 'themator' ); ?></div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <?php foreach ( $all_post_types as $pt ) : ?>
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
                        <input type="checkbox" name="tmopt_post_types[]" value="<?php echo esc_attr( $pt->name ); ?>"
                            <?php checked( in_array( $pt->name, $post_types_opt ) ); ?>>
                        <?php echo esc_html( $pt->labels->singular_name ); ?>
                        <span style="color:#bbb;font-size:11px;">(<?php echo esc_html( $pt->name ); ?>)</span>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <!-- CSS Custom -->
        <div class="tm-admin-section">
            <h2>🖊️ <?php esc_html_e( 'CSS Personnalisé', 'themator' ); ?></h2>
            <div class="tm-field-row">
                <div class="tm-field-label">
                    <?php esc_html_e( 'CSS global', 'themator' ); ?>
                    <div class="tm-field-desc"><?php esc_html_e( 'Injecté dans le &lt;head&gt; de chaque page Themator.', 'themator' ); ?></div>
                </div>
                <textarea name="tmopt_custom_css" rows="8" placeholder="/* votre CSS ici */"><?php echo esc_textarea( $custom_css ); ?></textarea>
            </div>
        </div>

        <div class="tm-btn-row">
            <button type="submit" class="tm-btn tm-btn-primary">💾 <?php esc_html_e( 'Sauvegarder les options', 'themator' ); ?></button>
        </div>
    </form>
</div>
