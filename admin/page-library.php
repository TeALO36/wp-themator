<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Handle delete
if ( isset( $_GET['delete_layout'] ) && check_admin_referer( 'delete_layout_' . absint( $_GET['delete_layout'] ) ) ) {
    wp_delete_post( absint( $_GET['delete_layout'] ), true );
    echo '<div class="tm-notice tm-notice-success">✅ ' . esc_html__( 'Modèle supprimé.', 'themator' ) . '</div>';
}

$layouts = get_posts( array(
    'post_type'      => 'tmator_layout',
    'posts_per_page' => -1,
    'orderby'        => 'date',
    'order'          => 'DESC',
) );
?>
<div class="themator-admin-wrap">
    <?php themator_admin_header( __( 'Bibliothèque', 'themator' ) ); ?>

    <div class="tm-notice tm-notice-info">
        💡 <?php esc_html_e( 'Sauvegardez vos layouts depuis le builder (bouton "Enregistrer comme modèle"). Retrouvez-les ici pour les charger sur n\'importe quelle page.', 'themator' ); ?>
    </div>

    <?php if ( empty( $layouts ) ) : ?>
    <div class="tm-admin-section" style="text-align:center; padding:60px 32px;">
        <div style="font-size:48px; margin-bottom:16px;">🗂️</div>
        <h3 style="color:#999; font-weight:400;"><?php esc_html_e( 'Aucun modèle sauvegardé', 'themator' ); ?></h3>
        <p style="color:#bbb; font-size:13px;"><?php esc_html_e( 'Construisez une page avec Themator et enregistrez-la comme modèle réutilisable.', 'themator' ); ?></p>
    </div>
    <?php else : ?>
    <div class="tm-library-grid">
        <?php foreach ( $layouts as $layout ) :
            $data = get_post_meta( $layout->ID, '_themator_data', true );
            $sections_count = 0;
            if ( $data ) {
                $parsed = json_decode( $data, true );
                $sections_count = isset( $parsed['sections'] ) ? count( $parsed['sections'] ) : 0;
            }
            $delete_url = wp_nonce_url(
                add_query_arg( 'delete_layout', $layout->ID ),
                'delete_layout_' . $layout->ID
            );
        ?>
        <div class="tm-layout-card">
            <div class="tm-layout-thumb">🖼️</div>
            <div class="tm-layout-info">
                <div class="tm-layout-name"><?php echo esc_html( $layout->post_title ); ?></div>
                <div class="tm-layout-meta">
                    <?php echo esc_html( $sections_count ); ?> <?php esc_html_e( 'section(s)', 'themator' ); ?> ·
                    <?php echo esc_html( get_the_date( 'd/m/Y', $layout ) ); ?>
                </div>
                <div class="tm-layout-actions">
                    <a href="<?php echo esc_url( $delete_url ); ?>"
                       class="tm-btn tm-btn-danger" style="padding:5px 10px;font-size:11px;"
                       onclick="return confirm('<?php esc_attr_e( 'Supprimer ce modèle ?', 'themator' ); ?>')">
                        🗑
                    </a>
                    <button type="button" class="tm-btn tm-btn-secondary"
                            style="padding:5px 10px;font-size:11px;"
                            data-layout-id="<?php echo esc_attr( $layout->ID ); ?>"
                            data-layout-data="<?php echo esc_attr( $data ); ?>">
                        📋 <?php esc_html_e( 'Copier JSON', 'themator' ); ?>
                    </button>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</div>

<script>
document.querySelectorAll('[data-layout-id]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var data = this.getAttribute('data-layout-data');
        navigator.clipboard.writeText(data).then(function() {
            alert('<?php esc_html_e( 'JSON copié dans le presse-papier !', 'themator' ); ?>');
        });
    });
});
</script>
